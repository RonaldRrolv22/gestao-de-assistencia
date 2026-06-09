import express from "express";
import path from "path";
import dns from "dns";
import "dotenv/config";
import { getAdminAuth, getAdminDb, verifyAdminToken } from "./src/lib/firebaseAdmin";
import { generatePdfFromHtml } from "./src/lib/generatePdf";
import { mergeRatPdfWithAttachments, PdfMergeAttachment } from "./src/lib/mergeRatPdf";
import {
  createPixPayment,
  createCardPaymentLink,
  checkPaymentStatus,
  createPublicPaymentToken,
  getPublicPaymentSummary,
  createPixPaymentByToken,
  createCardPaymentLinkByToken,
  checkPaymentStatusByToken,
  handlePagarmeWebhook,
} from "./src/services/pagarmePaymentService";
import { PROTECTED_USER_EMAILS } from "./src/services/userRoles";
import {
  buildMelhorEnvioAuthUrl,
  calculateMelhorEnvioShipping,
  exchangeMelhorEnvioCode,
  getMelhorEnvioBaseUrl,
  isLikelyJwtAccessToken,
} from "./src/lib/melhorEnvioClient";
import { syncCatalogToFirestore } from "./src/lib/catalogSyncService";
import {
  sendDocumentEmailToClient,
  triggerMaintenanceStartedEmail,
  triggerRatFinalizedEmail,
  triggerTrackingEmail,
} from "./src/lib/documentEmailService";
import {
  CorreiosApiError,
  CorreiosConfigError,
  createPrePostagem,
  isCorreiosConfigured,
  parseClientAddressWithCep,
  validateShippingRequest,
} from "./src/lib/correiosShippingService";
import { generateMaintenanceZpl } from "./src/lib/correiosZplGenerator";
import { MaintenanceRequest, ShippingLabel } from "./src/types";
import { sanitizeRequestDocId } from "./src/services/requestIds";

const VALID_USER_PROFILES = ["Administrador", "Técnico", "Usuário"] as const;

function isValidUserProfile(profile: unknown): profile is (typeof VALID_USER_PROFILES)[number] {
  return typeof profile === "string" && (VALID_USER_PROFILES as readonly string[]).includes(profile);
}

function mapFirebaseAuthError(err: unknown): { status: number; error: string; message: string } {
  const code = (err as { code?: string })?.code || "";
  const message = err instanceof Error ? err.message : String(err);
  if (code === "auth/email-already-exists" || message.includes("email-already-exists")) {
    return { status: 409, error: "EMAIL_EXISTS", message: "Este e-mail já está cadastrado." };
  }
  if (code === "auth/invalid-email" || message.includes("invalid-email")) {
    return { status: 400, error: "INVALID_EMAIL", message: "E-mail inválido." };
  }
  if (code === "auth/weak-password" || message.includes("weak-password")) {
    return { status: 400, error: "WEAK_PASSWORD", message: "Senha muito fraca. Use no mínimo 6 caracteres." };
  }
  if (message.includes("Credenciais Firebase Admin")) {
    return {
      status: 503,
      error: "ADMIN_NOT_CONFIGURED",
      message: "Firebase Admin não configurado no servidor. Verifique FIREBASE_SERVICE_ACCOUNT no .env.",
    };
  }
  return { status: 500, error: "INTERNAL_ERROR", message: message || "Erro interno." };
}

// Prefer IPv4 first for local dev environment
dns.setDefaultResultOrder("ipv4first");

export async function createApp() {
  const app = express();

  // Middleware to parse JSON bodies (HTML de relatórios pode incluir anexos em base64)
  app.use(express.json({ limit: "50mb" }));

  // CORS configuration
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Endpoint to calculate shipping costs via Melhor Envio
  app.post("/api/frete", async (req, res) => {
    try {
      const { cep_destino } = req.body;
      if (!cep_destino) {
        return res.status(400).json({ error: "CEP_DESTINO_REQUIRED", message: "CEP de destino não informado." });
      }

      const cep_origem = process.env.cep_origem || "50030917";
      const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET || process.env.frete;
      const hasOAuth =
        process.env.MELHOR_ENVIO_CLIENT_ID &&
        clientSecret &&
        process.env.MELHOR_ENVIO_REFRESH_TOKEN;
      const hasJwt = isLikelyJwtAccessToken(process.env.MELHOR_ENVIO_ACCESS_TOKEN || process.env.frete);

      if (!hasJwt && !hasOAuth) {
        return res.status(400).json({
          error: "TOKEN_MISSING",
          message:
            "Token Melhor Envio inválido. A chave configurada não é um access_token JWT. " +
            "Configure MELHOR_ENVIO_CLIENT_ID + MELHOR_ENVIO_CLIENT_SECRET + MELHOR_ENVIO_REFRESH_TOKEN, " +
            "ou acesse GET /api/melhor-envio/setup para autorizar o app.",
        });
      }

      const cleanDestination = cep_destino.replace(/\D/g, "");
      const cleanOrigin = cep_origem.replace(/\D/g, "");

      if (cleanDestination.length !== 8) {
        return res.status(400).json({ error: "CEP_INVALID", message: "CEP de destino deve conter exatamente 8 dígitos." });
      }

      console.log(`Calculando frete de ${cleanOrigin} para ${cleanDestination} via Melhor Envio...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const data = await Promise.race([
          calculateMelhorEnvioShipping(cleanOrigin, cleanDestination),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener("abort", () => reject(new Error("TIMEOUT")));
          }),
        ]);

        clearTimeout(timeoutId);

        return res.json(data);
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.message === "TIMEOUT") {
          return res.status(504).json({ error: "TIMEOUT", message: "A requisição para o cálculo de frete excedeu o limite de 15 segundos." });
        }

        const err = fetchError as Error & { status?: number; detail?: string };
        const status = err.status || 500;

        if (status === 401) {
          return res.status(401).json({
            error: "MELHOR_ENVIO_UNAUTHENTICATED",
            message:
              "Token Melhor Envio rejeitado (401). Gere um access_token JWT via OAuth em GET /api/melhor-envio/setup " +
              "e salve MELHOR_ENVIO_REFRESH_TOKEN no .env.",
            detail: err.detail,
          });
        }

        return res.status(status).json({
          error: "MELHOR_ENVIO_API_ERROR",
          message: err.message || "Erro na API do Melhor Envio.",
          detail: err.detail,
        });
      }
    } catch (err: unknown) {
      console.error("Erro no processamento da chamada /api/frete:", err);
      const message = err instanceof Error ? err.message : "Erro interno do servidor.";
      return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message });
    }
  });

  app.get("/api/melhor-envio/setup", (req, res) => {
    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const redirectUri = `${appUrl.replace(/\/$/, "")}/api/melhor-envio/callback`;
      const authUrl = buildMelhorEnvioAuthUrl(redirectUri);
      res.json({
        message: "Abra authUrl no navegador, autorize o app e copie os tokens exibidos no callback.",
        redirectUri,
        authUrl,
        requiredEnv: [
          "MELHOR_ENVIO_CLIENT_ID",
          "MELHOR_ENVIO_CLIENT_SECRET",
          "MELHOR_ENVIO_REFRESH_TOKEN",
        ],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao montar URL de autorização.";
      return res.status(400).json({ error: "SETUP_ERROR", message });
    }
  });

  app.get("/api/melhor-envio/callback", async (req, res) => {
    try {
      const code = req.query.code as string | undefined;
      if (!code) {
        return res.status(400).send("Parâmetro 'code' ausente. Autorize o app pelo fluxo OAuth.");
      }
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const redirectUri = `${appUrl.replace(/\/$/, "")}/api/melhor-envio/callback`;
      const tokens = await exchangeMelhorEnvioCode(code, redirectUri);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">
        <h1>Melhor Envio — tokens gerados</h1>
        <p>Copie estes valores para o arquivo <code>.env</code> e reinicie o servidor:</p>
        <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto">MELHOR_ENVIO_REFRESH_TOKEN=${tokens.refresh_token}
MELHOR_ENVIO_ACCESS_TOKEN=${tokens.access_token}</pre>
        <p>O access_token expira em 30 dias; o refresh_token renova automaticamente.</p>
      </body></html>`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro no callback OAuth.";
      return res.status(500).send(message);
    }
  });

  app.post("/api/catalog/sync", async (req, res) => {
    try {
      const { isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem sincronizar o catálogo." });
      }

      const summary = await syncCatalogToFirestore();
      return res.json(summary);
    } catch (err: unknown) {
      console.error("POST /api/catalog/sync:", err);
      const message = err instanceof Error ? err.message : "Erro ao sincronizar catálogo.";
      return res.status(500).json({ error: "CATALOG_SYNC_FAILED", message });
    }
  });

  app.post("/api/email/send-document", async (req, res) => {
    try {
      const { uid, isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem enviar documentos por e-mail." });
      }

      const { requestId, type } = req.body as { requestId?: string; type?: "budget" | "rat" };
      if (!requestId || !type || (type !== "budget" && type !== "rat")) {
        return res.status(400).json({
          error: "INVALID_BODY",
          message: "requestId e type (budget ou rat) são obrigatórios.",
        });
      }

      const profileSnap = await getAdminDb().collection("users").doc(uid).get();
      const sentBy = profileSnap.data()?.name || profileSnap.data()?.email || "Administrador";

      const result = await sendDocumentEmailToClient(requestId, type, sentBy);
      return res.json(result);
    } catch (err: unknown) {
      console.error("POST /api/email/send-document:", err);
      const message = err instanceof Error ? err.message : "Erro ao enviar e-mail.";
      return res.status(500).json({ error: "EMAIL_SEND_FAILED", message });
    }
  });

  app.post("/api/email/maintenance-started", async (req, res) => {
    try {
      const { isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem enviar e-mails." });
      }

      const { requestId } = req.body as { requestId?: string };
      if (!requestId) {
        return res.status(400).json({
          error: "INVALID_BODY",
          message: "requestId é obrigatório.",
        });
      }

      const result = await triggerMaintenanceStartedEmail(requestId);
      return res.json(result);
    } catch (err: unknown) {
      console.error("POST /api/email/maintenance-started:", err);
      const message = err instanceof Error ? err.message : "Erro ao enviar e-mail de manutenção.";
      return res.status(500).json({ error: "EMAIL_SEND_FAILED", message });
    }
  });

  app.post("/api/email/rat-finalized", async (req, res) => {
    try {
      const { isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem enviar e-mails." });
      }

      const { requestId } = req.body as { requestId?: string };
      if (!requestId) {
        return res.status(400).json({
          error: "INVALID_BODY",
          message: "requestId é obrigatório.",
        });
      }

      const result = await triggerRatFinalizedEmail(requestId);
      return res.json(result);
    } catch (err: unknown) {
      console.error("POST /api/email/rat-finalized:", err);
      const message = err instanceof Error ? err.message : "Erro ao enviar e-mail da RAT.";
      return res.status(500).json({ error: "EMAIL_SEND_FAILED", message });
    }
  });

  app.post("/api/email/tracking", async (req, res) => {
    try {
      const { uid, isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem enviar e-mails." });
      }

      const { requestId } = req.body as { requestId?: string };
      if (!requestId) {
        return res.status(400).json({
          error: "INVALID_BODY",
          message: "requestId é obrigatório.",
        });
      }

      const profileSnap = await getAdminDb().collection("users").doc(uid).get();
      const sentBy = profileSnap.data()?.name || profileSnap.data()?.email || "Administrador";

      const result = await triggerTrackingEmail(requestId, sentBy, { allowResend: true });
      return res.json(result);
    } catch (err: unknown) {
      console.error("POST /api/email/tracking:", err);
      const message = err instanceof Error ? err.message : "Erro ao enviar e-mail de rastreio.";
      return res.status(500).json({ error: "EMAIL_SEND_FAILED", message });
    }
  });

  app.post("/api/shipping/generate-labels", async (req, res) => {
    try {
      if (!isCorreiosConfigured()) {
        return res.status(503).json({
          error: "CORREIOS_NOT_CONFIGURED",
          message: "Credenciais Correios não configuradas (CORREIOS_TOKEN, CORREIOS_CARTAO_POSTAGEM).",
        });
      }

      let uid: string;
      try {
        ({ uid } = await verifyAdminToken(req.headers.authorization));
      } catch {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Token de autenticação inválido ou ausente." });
      }

      const { requestId } = req.body as { requestId?: string };
      if (!requestId) {
        return res.status(400).json({
          error: "INVALID_BODY",
          message: "requestId é obrigatório.",
        });
      }

      const docId = sanitizeRequestDocId(requestId);
      const snap = await getAdminDb().collection("maintenance_requests").doc(docId).get();
      if (!snap.exists) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Ordem de serviço não encontrada." });
      }

      const request = { ...(snap.data() as MaintenanceRequest), id: snap.data()?.id || requestId };
      const validationError = validateShippingRequest(request);
      if (validationError) {
        const isAlreadyGenerated = Boolean(request.shippingLabel?.trackingCode);
        return res.status(isAlreadyGenerated ? 409 : 400).json({
          error: isAlreadyGenerated ? "ALREADY_GENERATED" : "VALIDATION_ERROR",
          message: validationError,
        });
      }

      const prePostagem = await createPrePostagem(request);
      const endereco = await parseClientAddressWithCep(request);
      const contractNumber = process.env.CORREIOS_CARTAO_POSTAGEM || process.env.CORREIOS_CONTRATO || "";

      const zplContent = generateMaintenanceZpl({
        request,
        endereco,
        trackingCode: prePostagem.trackingCode,
        contractNumber,
      });

      const shippingLabel: ShippingLabel = {
        trackingCode: prePostagem.trackingCode,
        idPrePostagem: prePostagem.idPrePostagem,
        serviceCode: prePostagem.service.code,
        serviceName: prePostagem.service.name,
        generatedAt: new Date().toISOString(),
        generatedBy: uid,
      };

      const updatedRequest: MaintenanceRequest = {
        ...request,
        shippingLabel,
      };

      await getAdminDb().collection("maintenance_requests").doc(docId).update({
        shippingLabel,
        updatedAt: new Date(),
      });

      const profileSnap = await getAdminDb().collection("users").doc(uid).get();
      const sentBy = profileSnap.data()?.name || profileSnap.data()?.email || "Administrador";

      let emailResult: Awaited<ReturnType<typeof triggerTrackingEmail>> | null = null;
      try {
        emailResult = await triggerTrackingEmail(requestId, sentBy, {
          trackingCode: shippingLabel.trackingCode,
          serviceName: shippingLabel.serviceName,
          requestSnapshot: updatedRequest,
        });
      } catch (emailErr) {
        console.error("POST /api/shipping/generate-labels — e-mail de rastreio:", emailErr);
        emailResult = {
          success: true,
          sentTo: updatedRequest.clientEmail || "",
          sentAt: new Date().toISOString(),
          status: "failed",
          error: emailErr instanceof Error ? emailErr.message : "Falha ao enviar e-mail de rastreio.",
        };
      }

      const safeName = (request.requestNumber || request.id).replace(/[^\w\-#]+/g, "_");
      return res.json({
        success: true,
        trackingCode: shippingLabel.trackingCode,
        idPrePostagem: shippingLabel.idPrePostagem,
        serviceName: shippingLabel.serviceName,
        shippingLabel,
        zplContent,
        fileName: `etiqueta_${safeName}.zpl`,
        emailResult,
      });
    } catch (err: unknown) {
      console.error("POST /api/shipping/generate-labels:", err);
      if (err instanceof CorreiosConfigError) {
        return res.status(503).json({ error: "CORREIOS_NOT_CONFIGURED", message: err.message });
      }
      if (err instanceof CorreiosApiError) {
        return res.status(502).json({ error: "CORREIOS_API_ERROR", message: err.message, details: err.payload });
      }
      const message = err instanceof Error ? err.message : "Erro ao gerar etiqueta.";
      return res.status(500).json({ error: "SHIPPING_LABEL_FAILED", message });
    }
  });

  app.post("/api/shipping/download-label", async (req, res) => {
    try {
      try {
        await verifyAdminToken(req.headers.authorization);
      } catch {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Token de autenticação inválido ou ausente." });
      }

      const { requestId } = req.body as { requestId?: string };
      if (!requestId) {
        return res.status(400).json({ error: "INVALID_BODY", message: "requestId é obrigatório." });
      }

      const docId = sanitizeRequestDocId(requestId);
      const snap = await getAdminDb().collection("maintenance_requests").doc(docId).get();
      if (!snap.exists) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Ordem de serviço não encontrada." });
      }

      const request = { ...(snap.data() as MaintenanceRequest), id: snap.data()?.id || requestId };
      if (!request.shippingLabel?.trackingCode) {
        return res.status(404).json({
          error: "LABEL_NOT_FOUND",
          message: "Nenhuma etiqueta gerada para esta ordem de serviço.",
        });
      }

      const endereco = await parseClientAddressWithCep(request);
      const contractNumber = process.env.CORREIOS_CARTAO_POSTAGEM || process.env.CORREIOS_CONTRATO || "";
      const zplContent = generateMaintenanceZpl({
        request,
        endereco,
        trackingCode: request.shippingLabel.trackingCode,
        contractNumber,
      });

      const safeName = (request.requestNumber || request.id).replace(/[^\w\-#]+/g, "_");
      return res.json({
        success: true,
        trackingCode: request.shippingLabel.trackingCode,
        zplContent,
        fileName: `etiqueta_${safeName}.zpl`,
      });
    } catch (err: unknown) {
      console.error("POST /api/shipping/download-label:", err);
      const message = err instanceof Error ? err.message : "Erro ao baixar etiqueta.";
      return res.status(500).json({ error: "SHIPPING_LABEL_DOWNLOAD_FAILED", message });
    }
  });

  app.get("/api/hub-entry-url", async (req, res) => {
    try {
      try {
        await verifyAdminToken(req.headers.authorization);
      } catch (authErr) {
        const authMessage = authErr instanceof Error ? authErr.message : "auth failed";
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: authMessage.includes("Firebase Admin")
            ? authMessage
            : "Token de autenticação inválido ou ausente.",
        });
      }

      const url = (process.env.HUB_TESTES_URL || "").trim().replace(/^["']|["']$/g, "");
      if (!url) {
        return res.status(503).json({
          error: "HUB_NOT_CONFIGURED",
          message: "Hub de Testes não configurado (HUB_TESTES_URL).",
        });
      }

      return res.json({ url });
    } catch (err: unknown) {
      console.error("GET /api/hub-entry-url:", err);
      const message = err instanceof Error ? err.message : "Erro ao obter URL do Hub de Testes.";
      return res.status(500).json({ error: "HUB_ENTRY_FAILED", message });
    }
  });

  // Admin: create user (Auth + Firestore profile)
  app.post("/api/admin/users", async (req, res) => {
    try {
      const { isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem criar usuários." });
      }

      const { name, email, profile, password } = req.body;
      if (!name || !email || !profile || !password) {
        return res.status(400).json({ error: "MISSING_FIELDS", message: "Nome, e-mail, perfil e senha são obrigatórios." });
      }
      if (!isValidUserProfile(profile)) {
        return res.status(400).json({ error: "INVALID_PROFILE", message: "Perfil inválido. Use Administrador, Técnico ou Usuário." });
      }

      const auth = getAdminAuth();
      const db = getAdminDb();
      const emailLower = email.trim().toLowerCase();
      const nameTrimmed = name.trim();

      const created = await auth.createUser({
        email: emailLower,
        password,
        displayName: nameTrimmed,
      });

      await db.collection("users").doc(created.uid).set({
        name: nameTrimmed,
        email: emailLower,
        profile,
        createdAt: new Date().toISOString(),
        source: "admin_created",
      });

      return res.status(201).json({
        id: created.uid,
        name: nameTrimmed,
        email: emailLower,
        profile,
      });
    } catch (err: unknown) {
      const mapped = mapFirebaseAuthError(err);
      console.error("POST /api/admin/users:", err);
      return res.status(mapped.status).json({ error: mapped.error, message: mapped.message });
    }
  });

  // Admin: update user (Auth + Firestore profile)
  app.patch("/api/admin/users/:uid", async (req, res) => {
    try {
      const { isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem editar usuários." });
      }

      const targetUid = req.params.uid;
      const { name, email, profile, password } = req.body as {
        name?: string;
        email?: string;
        profile?: string;
        password?: string;
      };

      if (!name?.trim() && !email?.trim() && !profile && !password) {
        return res.status(400).json({ error: "MISSING_FIELDS", message: "Informe ao menos um campo para atualizar." });
      }
      if (profile !== undefined && !isValidUserProfile(profile)) {
        return res.status(400).json({ error: "INVALID_PROFILE", message: "Perfil inválido. Use Administrador, Técnico ou Usuário." });
      }

      const auth = getAdminAuth();
      const db = getAdminDb();
      const profileSnap = await db.collection("users").doc(targetUid).get();
      if (!profileSnap.exists) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Usuário não encontrado." });
      }

      const existing = profileSnap.data()!;
      const existingEmail = (existing.email || "").toLowerCase();
      const emailLower = email?.trim().toLowerCase();
      const isProtected = PROTECTED_USER_EMAILS.includes(existingEmail);

      if (isProtected && emailLower && emailLower !== existingEmail) {
        return res.status(403).json({
          error: "PROTECTED_USER",
          message: "Não é permitido alterar o e-mail deste administrador principal.",
        });
      }

      const authUpdate: { displayName?: string; email?: string; password?: string } = {};
      if (name?.trim()) authUpdate.displayName = name.trim();
      if (emailLower && emailLower !== existingEmail) authUpdate.email = emailLower;
      if (password) authUpdate.password = password;

      if (Object.keys(authUpdate).length > 0) {
        await auth.updateUser(targetUid, authUpdate);
      }

      const firestoreUpdate: Record<string, string> = {
        updatedAt: new Date().toISOString(),
      };
      if (name?.trim()) firestoreUpdate.name = name.trim();
      if (emailLower) firestoreUpdate.email = emailLower;
      if (profile) firestoreUpdate.profile = profile;

      await db.collection("users").doc(targetUid).update(firestoreUpdate);

      const updatedSnap = await db.collection("users").doc(targetUid).get();
      const updated = updatedSnap.data()!;

      return res.json({
        id: targetUid,
        name: updated.name,
        email: updated.email,
        profile: updated.profile,
      });
    } catch (err: unknown) {
      const mapped = mapFirebaseAuthError(err);
      console.error("PATCH /api/admin/users/:uid:", err);
      return res.status(mapped.status).json({ error: mapped.error, message: mapped.message });
    }
  });

  // Admin: delete user
  app.delete("/api/admin/users/:uid", async (req, res) => {
    try {
      const { isAdmin } = await verifyAdminToken(req.headers.authorization);
      if (!isAdmin) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Apenas administradores podem excluir usuários." });
      }

      const targetUid = req.params.uid;
      const db = getAdminDb();
      const auth = getAdminAuth();

      const profileSnap = await db.collection("users").doc(targetUid).get();
      if (!profileSnap.exists) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Usuário não encontrado." });
      }

      const email = profileSnap.data()?.email?.toLowerCase();
      if (email && PROTECTED_USER_EMAILS.includes(email)) {
        return res.status(403).json({ error: "PROTECTED_USER", message: "Não é permitido excluir este administrador principal." });
      }

      try {
        await auth.deleteUser(targetUid);
      } catch (authErr) {
        const msg = authErr instanceof Error ? authErr.message : String(authErr);
        if (!msg.includes("user-not-found")) {
          throw authErr;
        }
      }

      await db.collection("users").doc(targetUid).delete();

      return res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro interno.";
      console.error("DELETE /api/admin/users:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message });
    }
  });

  app.post("/api/export-pdf", async (req, res) => {
    try {
      const { html, filename, attachments } = req.body as {
        html?: string;
        filename?: string;
        attachments?: PdfMergeAttachment[];
      };
      if (!html || typeof html !== "string") {
        return res.status(400).json({ error: "HTML_REQUIRED", message: "Conteúdo HTML é obrigatório." });
      }

      const attList = Array.isArray(attachments)
        ? attachments.filter((a) => a?.storagePath || a?.url)
        : [];
      const pdfBuffer =
        attList.length > 0
          ? await mergeRatPdfWithAttachments(html, attList)
          : await generatePdfFromHtml(html);

      const safeName = (filename || "documento.pdf").replace(/[^\w\s.-]/g, "_");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("POST /api/export-pdf:", err);
      const message = err instanceof Error ? err.message : "Erro ao gerar PDF.";
      return res.status(500).json({ error: "PDF_GENERATION_FAILED", message });
    }
  });

  app.post("/api/pagarme/pix", async (req, res) => {
    try {
      const { requestId, token, forceRefresh, amountCents } = req.body as {
        requestId?: string;
        token?: string;
        forceRefresh?: boolean;
        amountCents?: number;
      };
      const pixOptions = {
        forceRefresh: !!forceRefresh,
        amountCents: typeof amountCents === "number" ? amountCents : undefined,
      };
      const result = token
        ? await createPixPaymentByToken(token, pixOptions)
        : requestId
          ? await createPixPayment(requestId, pixOptions)
          : null;
      if (!result) {
        return res.status(400).json({ error: "INVALID_REQUEST", message: "Informe requestId ou token." });
      }
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar PIX.";
      console.error("POST /api/pagarme/pix:", err);
      return res.status(400).json({ error: "PIX_FAILED", message });
    }
  });

  app.post("/api/pagarme/card-link", async (req, res) => {
    try {
      const { requestId, token, amountCents } = req.body as {
        requestId?: string;
        token?: string;
        amountCents?: number;
      };
      const cardOptions = {
        amountCents: typeof amountCents === "number" ? amountCents : undefined,
      };
      const result = token
        ? await createCardPaymentLinkByToken(token, cardOptions)
        : requestId
          ? await createCardPaymentLink(requestId, cardOptions)
          : null;
      if (!result) {
        return res.status(400).json({ error: "INVALID_REQUEST", message: "Informe requestId ou token." });
      }
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar link de cartão.";
      console.error("POST /api/pagarme/card-link:", err);
      return res.status(400).json({ error: "CARD_LINK_FAILED", message });
    }
  });

  app.get("/api/pagarme/status/:requestId", async (req, res) => {
    try {
      const result = await checkPaymentStatus(req.params.requestId);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao verificar pagamento.";
      console.error("GET /api/pagarme/status:", err);
      return res.status(400).json({ error: "STATUS_FAILED", message });
    }
  });

  app.get("/api/pagarme/status-by-token/:token", async (req, res) => {
    try {
      const result = await checkPaymentStatusByToken(req.params.token);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao verificar pagamento.";
      console.error("GET /api/pagarme/status-by-token:", err);
      return res.status(400).json({ error: "STATUS_FAILED", message });
    }
  });

  app.post("/api/pagarme/public-token", async (req, res) => {
    try {
      const { requestId } = req.body as { requestId?: string };
      if (!requestId) {
        return res.status(400).json({ error: "REQUEST_ID_REQUIRED", message: "requestId é obrigatório." });
      }
      const result = await createPublicPaymentToken(requestId);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar link público.";
      console.error("POST /api/pagarme/public-token:", err);
      return res.status(400).json({ error: "PUBLIC_TOKEN_FAILED", message });
    }
  });

  app.get("/api/pagarme/public/:token", async (req, res) => {
    try {
      const summary = await getPublicPaymentSummary(req.params.token);
      return res.json(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Link inválido.";
      console.error("GET /api/pagarme/public:", err);
      return res.status(404).json({ error: "NOT_FOUND", message });
    }
  });

  app.post("/api/pagarme/webhook", async (req, res) => {
    try {
      await handlePagarmeWebhook(req.body);
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("POST /api/pagarme/webhook:", err);
      const message = err instanceof Error ? err.message : "Erro ao processar webhook.";
      return res.status(500).json({ error: "WEBHOOK_FAILED", message });
    }
  });

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const runBackgroundCatalogSync = async (label: string) => {
    try {
      const summary = await syncCatalogToFirestore();
      console.log(
        `[catalog-sync:${label}] ${summary.total} itens (${summary.imported} novos, ${summary.updated} atualizados, ${summary.removed} removidos)`
      );
    } catch (err) {
      console.error(`[catalog-sync:${label}]`, err);
    }
  };

  const catalogSyncIntervalMs = Math.max(
    60_000,
    parseInt(process.env.CATALOG_SYNC_INTERVAL_MS || "1800000", 10) || 1_800_000
  );

  if (!process.env.VERCEL) {
    void runBackgroundCatalogSync("startup");
    setInterval(() => void runBackgroundCatalogSync("interval"), catalogSyncIntervalMs);
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default createApp;
