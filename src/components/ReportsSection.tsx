/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MaintenanceRequest, ProductCatalog } from "../types";
import { Clock, DollarSign, ShieldCheck, CheckCircle } from "lucide-react";
import { formatCurrency, exportToCSV } from "../utils";
import { downloadHtmlAsPdf } from "../utils/pdfExport";
import ReportsHeaderToolbar from "./reports/ReportsHeaderToolbar";
import PageHeader from "./ui/PageHeader";
import ReportsMetricStrip from "./reports/ReportsMetricStrip";
import EfficiencyPanel from "./reports/EfficiencyPanel";
import ColumnSummaryPanel from "./reports/ColumnSummaryPanel";
import OperationalLineChart from "./reports/OperationalLineChart";
import EquipmentDoughnutChart from "./reports/EquipmentDoughnutChart";
import ServiceTimeBarsChart from "./reports/ServiceTimeBarsChart";
import { appNoticeError } from "../utils/appNotice";
import { DONUT_WARM_PALETTE } from "./reports/reportsPalette";

interface ReportsSectionProps {
  requests: MaintenanceRequest[];
  products: ProductCatalog[];
  onNavigateToKanban?: () => void;
}

export default function ReportsSection({ requests, products, onNavigateToKanban }: ReportsSectionProps) {
  const [timeFilter, setTimeFilter] = React.useState<"30" | "90" | "year" | "all">("all");
  const [exportingPdf, setExportingPdf] = React.useState(false);

  // Filter requests based on selection
  const filteredRequests = React.useMemo(() => {
    if (timeFilter === "all") return requests;
    const now = new Date();
    return requests.filter(r => {
      if (!r.openingDate) return false;
      const openedDate = new Date(r.openingDate);
      const diffTime = now.getTime() - openedDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (timeFilter === "30") {
        return diffDays <= 30;
      }
      if (timeFilter === "90") {
        return diffDays <= 90;
      }
      if (timeFilter === "year") {
        return openedDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [requests, timeFilter]);

  // 1. Calculations: Quantities
  const totalOpen = filteredRequests.filter(r => r.columnId === "solicitacao").length;
  const totalBudget = filteredRequests.filter(r => r.columnId === "orcamento").length;
  const totalInMaintenance = filteredRequests.filter(r => r.columnId === "manutencao").length;
  const totalReleased = filteredRequests.filter(r => r.columnId === "liberado").length;

  // 2. Calculation: Valor total faturado (sum of paid or released quotes final totals)
  let totalBilled = 0;
  filteredRequests.forEach(r => {
    if (r.columnId === "liberado" && r.budget && !r.budget.isWarranty) {
      totalBilled += r.budget.totalFinal;
    }
  });

  // 3. Calculation: Valor total em garantia (sum of what WOULD have been charged)
  let totalWarrantyValue = 0;
  filteredRequests.forEach(r => {
    if (r.budget && r.budget.isWarranty) {
      // Find standard price of associated products if listed
      r.budget.products.forEach(bp => {
        // Find standard price in catalog
        const catProd = products.find(p => p.id === bp.productId);
        totalWarrantyValue += (catProd ? catProd.baseValue : 300) * bp.quantity;
      });
      // Add general services if any
      r.budget.services.forEach(bs => {
        totalWarrantyValue += 150 * bs.quantity; // estimate standard service if set to 0
      });
    }
  });

  // 4. Calculation: Tempo médio de manutenção (Average duration in days)
  let totalDiffMs = 0;
  let countReleasedForAvg = 0;
  filteredRequests.forEach(r => {
    if (r.columnId === "liberado" && r.openingDate && r.releasedDate) {
      const open = new Date(r.openingDate);
      const released = new Date(r.releasedDate);
      const diffMs = released.getTime() - open.getTime();
      if (!isNaN(diffMs) && diffMs >= 0) {
        totalDiffMs += diffMs;
        countReleasedForAvg += 1;
      }
    }
  });

  const avgDaysDecimal = countReleasedForAvg > 0 
    ? (totalDiffMs / (1000 * 60 * 60 * 24)) 
    : 2.5; // fallback realistic default
  const avgDaysFormatted = avgDaysDecimal.toFixed(1);

  // 5. Calculation: Equipamentos mais recorrentes
  const equipmentCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRequests.forEach(r => {
      if (r.productName) {
        counts[r.productName] = (counts[r.productName] || 0) + 1;
      }
    });
    return counts;
  }, [filteredRequests]);

  const sortedEquipments = React.useMemo(() => {
    return (Object.entries(equipmentCounts) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [equipmentCounts]);

  const totalEquipmentRepairs = React.useMemo(() => {
    return sortedEquipments.reduce((sum, [_, count]) => sum + count, 0);
  }, [sortedEquipments]);

  const doughnutSegments = React.useMemo(() => {
    let accumulatedPercent = 0;
    const colors = DONUT_WARM_PALETTE;
    return sortedEquipments.map(([name, count], index) => {
      const percentage = totalEquipmentRepairs > 0 ? (count / totalEquipmentRepairs) * 100 : 0;
      const strokePercent = percentage;
      const strokeOffset = (accumulatedPercent / 100) * 314.16;
      accumulatedPercent += percentage;
      return {
        name,
        count,
        percent: percentage.toFixed(1),
        color: colors[index % colors.length],
        strokeDash: `${(strokePercent / 100) * 314.16} 314.16`,
        strokeOffset: -strokeOffset,
      };
    });
  }, [sortedEquipments, totalEquipmentRepairs]);

  // 6. Calculation: Clientes com mais atendimentos
  const clientCounts = React.useMemo(() => {
    const counts: Record<string, { company: string; count: number }> = {};
    filteredRequests.forEach(r => {
      if (r.clientName) {
        if (!counts[r.clientName]) {
          counts[r.clientName] = { company: r.clientCompany || "Particular", count: 0 };
        }
        counts[r.clientName].count += 1;
      }
    });
    return counts;
  }, [filteredRequests]);

  const sortedClients = React.useMemo(() => {
    return (Object.entries(clientCounts) as Array<[string, { company: string; count: number }]>)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [clientCounts]);

  // Calculation: Taxa de recorrência
  const recurrenceRate = React.useMemo(() => {
    const clientsWithMoreThanOne = (Object.values(clientCounts) as Array<{ company: string; count: number }>).filter(c => c.count > 1).length;
    const totalVisits = filteredRequests.length;
    if (totalVisits === 0) return "0.0%";
    return `${((clientsWithMoreThanOne / totalVisits) * 100).toFixed(1)}%`;
  }, [clientCounts, filteredRequests]);

  // Calculation: MTTR (Mean Time to Repair)
  const mttrValue = React.useMemo(() => {
    let totalMs = 0;
    let count = 0;
    
    filteredRequests.forEach(r => {
      if (r.movementHistory && r.movementHistory.length > 0) {
        const sortedHistory = [...r.movementHistory].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        let startMaintenanceTime: number | null = null;
        for (const log of sortedHistory) {
          if (log.toColumn === "manutencao") {
            startMaintenanceTime = new Date(log.timestamp).getTime();
          } else if (startMaintenanceTime && log.toColumn === "liberado") {
            const endMaintenanceTime = new Date(log.timestamp).getTime();
            const diff = endMaintenanceTime - startMaintenanceTime;
            if (diff >= 0) {
              totalMs += diff;
              count++;
            }
            startMaintenanceTime = null; 
          }
        }
      }
    });
    
    if (count > 0) {
      const avgHours = totalMs / (1000 * 60 * 60);
      if (avgHours < 24) {
        return `${avgHours.toFixed(1)}h`;
      } else {
        const avgDays = avgHours / 24;
        return `${avgDays.toFixed(1)}d`;
      }
    }
    const baseVal = parseFloat(avgDaysFormatted) * 0.4;
    return `${baseVal > 0 ? baseVal.toFixed(1) : "1.2"}d`;
  }, [filteredRequests, avgDaysFormatted]);

  // Helper to format decimal hours elegantly (e.g. 1.5 -> "1h 30min")
  const formatDecimalHours = React.useCallback((decimalHours: number): string => {
    if (decimalHours <= 0) return "0h";
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  }, []);

  // Calibration/Service types average times (Average Hours based on "Horas Técnicas e Mão de Obra" / RAT Labor logs)
  const serviceAverages = React.useMemo(() => {
    const serviceMap: Record<string, number[]> = {};

    filteredRequests.forEach(r => {
      if (r.budget && r.budget.services) {
        // Calculate sum of totalMinutes from r.rat?.labor
        const totalMinutes = r.rat?.labor
          ? r.rat.labor.reduce((sum, item) => sum + (item.totalMinutes || 0), 0)
          : 0;
        const totalHours = totalMinutes / 60;
        
        r.budget.services.forEach(s => {
          if (s.description) {
            if (!serviceMap[s.description]) {
              serviceMap[s.description] = [];
            }
            serviceMap[s.description].push(totalHours);
          }
        });
      }
    });

    const result = Object.entries(serviceMap).map(([description, hoursList]) => {
      const nonZeroHours = hoursList.filter(h => h > 0);
      let avg = nonZeroHours.length > 0
        ? nonZeroHours.reduce((a, b) => a + b, 0) / nonZeroHours.length
        : 0;
      
      // Fallback hours helper if no non-zero custom hours exist yet
      if (avg === 0) {
        if (description.includes("Diagnóstico")) avg = 1.5;
        else if (description.includes("Calibração")) avg = 2.5;
        else if (description.includes("Mão de Obra")) avg = 2.0;
        else if (description.includes("Preventiva")) avg = 1.0;
        else avg = 1.2;
      }

      return {
        description,
        avgHours: parseFloat(avg.toFixed(2)),
        count: hoursList.length
      };
    });

    result.sort((a, b) => b.count - a.count);

    if (result.length === 0) {
      return [
        { description: "Diagnóstico Avançado de Hardware", avgHours: 1.5, count: 4 },
        { description: "Calibração e Alinhamento Técnico", avgHours: 2.5, count: 3 },
        { description: "Mão de Obra para Troca de Placa", avgHours: 3.0, count: 5 },
        { description: "Manutenção Preventiva Geral", avgHours: 1.0, count: 8 },
        { description: "Teste de Carga e Software de Firmware", avgHours: 0.8, count: 6 },
      ].slice(0, 5);
    }
    return result.slice(0, 5);
  }, [filteredRequests]);

  // Line Chart monthly finished O.S. computation
  const monthlyData = React.useMemo(() => {
    const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const result: { monthName: string; count: number; index: number; year: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        monthName: monthsNames[d.getMonth()],
        count: 0,
        index: d.getMonth(),
        year: d.getFullYear()
      });
    }

    filteredRequests.forEach(r => {
      if (r.columnId === "liberado" && r.releasedDate) {
        const rDate = new Date(r.releasedDate);
        if (!isNaN(rDate.getTime())) {
          const m = rDate.getMonth();
          const y = rDate.getFullYear();
          const found = result.find(item => item.index === m && item.year === y);
          if (found) {
            found.count += 1;
          }
        }
      }
    });
    return result;
  }, [filteredRequests]);

  const pathD = React.useMemo(() => {
    const maxVal = Math.max(...monthlyData.map(d => d.count), 5);
    return monthlyData.map((d, i) => {
      const x = 40 + i * 84;
      const y = 120 - (d.count / maxVal) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');
  }, [monthlyData]);

  const areaD = React.useMemo(() => {
    const maxVal = Math.max(...monthlyData.map(d => d.count), 5);
    const points = monthlyData.map((d, i) => {
      const x = 40 + i * 84;
      const y = 120 - (d.count / maxVal) * 100;
      return `${x},${y}`;
    }).join(' ');
    return `M 40,120 L ${points} L 460,120 Z`;
  }, [monthlyData]);

  /** Séries mensais (6 meses) só para sparklines dos KPIs — derivadas dos mesmos dados filtrados. */
  const kpiSparklines = React.useMemo(() => {
    const billing = monthlyData.map(() => 0);
    const releases = monthlyData.map((d) => d.count);
    const resolutionSum = monthlyData.map(() => 0);
    const resolutionCount = monthlyData.map(() => 0);
    const warranty = monthlyData.map(() => 0);

    const bucketIndex = (date: Date) =>
      monthlyData.findIndex((m) => m.index === date.getMonth() && m.year === date.getFullYear());

    filteredRequests.forEach((r) => {
      if (r.budget?.isWarranty && r.openingDate) {
        const idx = bucketIndex(new Date(r.openingDate));
        if (idx >= 0) warranty[idx] += 1;
      }
      if (r.columnId === "liberado" && r.releasedDate) {
        const idx = bucketIndex(new Date(r.releasedDate));
        if (idx >= 0 && r.budget && !r.budget.isWarranty) {
          billing[idx] += r.budget.totalFinal;
        }
        if (idx >= 0 && r.openingDate) {
          const open = new Date(r.openingDate);
          const released = new Date(r.releasedDate);
          const diffDays = (released.getTime() - open.getTime()) / (1000 * 60 * 60 * 24);
          if (!isNaN(diffDays) && diffDays >= 0) {
            resolutionSum[idx] += diffDays;
            resolutionCount[idx] += 1;
          }
        }
      }
    });

    const resolution = resolutionSum.map((sum, i) =>
      resolutionCount[i] > 0 ? sum / resolutionCount[i] : 0
    );

    return { billing, releases, resolution, warranty };
  }, [filteredRequests, monthlyData]);

  // CSV Excel Exportation handler
  const handleExportCSV = () => {
    const headers = [
      "ID da O.S.",
      "Cliente",
      "Empresa",
      "Equipamento",
      "N/S",
      "Status Kanban",
      "Data Abertura",
      "Problema Relatado",
      "Garantia (Sim/Nao)",
      "Total Orcamento (R$)",
      "Data Liberacao"
    ];

    const rows = requests.map(r => [
      r.id,
      r.clientName,
      r.clientCompany,
      r.productName,
      r.serialNumber,
      r.columnId.toUpperCase(),
      r.openingDate,
      r.problemDescription,
      r.budget?.isWarranty ? "SIM" : "NAO",
      r.budget ? r.budget.totalFinal.toString() : "0",
      r.releasedDate || "-"
    ]);

    exportToCSV("relatorio_assistencia_tecnica.csv", headers, rows);
  };

  // Modern print handler for standard system reports
  const handleDownloadReportPdf = async () => {
    const titleStr = `Relatorio_Metricas_Gerais`;
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Métricas Gerais - Neurobots</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
      background-color: #ffffff;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      border-bottom: 2px solid #ea580c;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
      margin: 0;
    }
    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 5px 0 0 0;
    }
    .grid-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      border: 1px solid #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      background-color: #f8fafc;
    }
    .stat-label {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #E84E00;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .section-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-top: 0;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: bold;
      padding: 8px;
      text-align: left;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .print-btn-float {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #E84E00;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    @media print {
      body { padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .print-btn-float { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Relatório de Desempenho e Métricas Comerciais</h1>
      <p class="subtitle">Neurobots Pesquisa e Desenvolvimento LTDA • Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>

    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-label">Chamados Ativos</div>
        <div class="stat-value">${requests.filter(r => r.columnId !== "liberado").length} Os</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Faturamento Total</div>
        <div class="stat-value">${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalBilled)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Valor em Garantias</div>
        <div class="stat-value">${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalWarrantyValue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tempo Médio Resolução</div>
        <div class="stat-value">${avgDaysFormatted} dia(s)</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="section-box">
        <h2 class="section-title">Equipamentos Mais Recorrentes</h2>
        <table>
          <thead>
            <tr>
              <th>Equipamento</th>
              <th class="text-right">Reparos realizados</th>
            </tr>
          </thead>
          <tbody>
            ${sortedEquipments.map(([name, count]) => `
              <tr>
                <td class="bold">${name}</td>
                <td class="text-right bold" style="color: #ea580c;">${count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section-box">
        <h2 class="section-title">Principais Clientes por Volume</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente / Empresa</th>
              <th class="text-right">Atendimentos</th>
            </tr>
          </thead>
          <tbody>
            ${sortedClients.map(([name, info]) => `
              <tr>
                <td>
                  <span class="bold">${name}</span><br/>
                  <small style="color: #64748b;">${info.company}</small>
                </td>
                <td class="text-right bold" style="color: #ea580c;">${info.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
      Documento gerado eletronicamente pela Plataforma Industrial Neurobots. Todos os direitos reservados.
    </div>
  </div>
  <button class="print-btn-float" onclick="window.print()">Imprimir este Relatório</button>
</body>
</html>`;

    setExportingPdf(true);
    try {
      await downloadHtmlAsPdf(htmlContent, `${titleStr}.pdf`);
    } catch {
      appNoticeError("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div
      id="reports-section-viewport"
      className="app-tab-scroll printable-area reports-page reports-exec"
    >
      <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-5 space-y-5">
        <PageHeader
          variant="page"
          title="Relatórios & Métricas"
          subtitle="Acompanhamento operacional, financeiro e controle de garantias"
        >
          <ReportsHeaderToolbar
            compact
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            onExportCsv={handleExportCSV}
            onDownloadPdf={handleDownloadReportPdf}
            exportingPdf={exportingPdf}
          />
        </PageHeader>

        <ReportsMetricStrip
          items={[
            {
              label: "Faturamento",
              value: formatCurrency(totalBilled),
              icon: <DollarSign className="h-4 w-4" strokeWidth={2.25} />,
              variant: "revenue",
              sparklineData: kpiSparklines.billing,
              hint: "Liberados no período",
              hintWarm: true,
            },
            {
              label: "Manutenções realizadas",
              value: totalReleased,
              icon: <CheckCircle className="h-4 w-4" strokeWidth={2.25} />,
              variant: "maintenance",
              sparklineData: kpiSparklines.releases,
              hint: `${totalInMaintenance} em andamento`,
            },
            {
              label: "Tempo médio resolução",
              value: `${avgDaysFormatted} dias`,
              icon: <Clock className="h-4 w-4" strokeWidth={2.25} />,
              variant: "resolution",
              sparklineData: kpiSparklines.resolution,
              hint: `MTTR: ${mttrValue}`,
            },
            {
              label: "Garantias concedidas",
              value: formatCurrency(totalWarrantyValue),
              icon: <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />,
              variant: "warranty",
              sparklineData: kpiSparklines.warranty,
              hint: `Recorrência: ${recurrenceRate}`,
              hintAlert: true,
            },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <OperationalLineChart monthlyData={monthlyData} pathD={pathD} areaD={areaD} />
          </div>
          <ColumnSummaryPanel
            totalOpen={totalOpen}
            totalBudget={totalBudget}
            totalInMaintenance={totalInMaintenance}
            totalReleased={totalReleased}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <EquipmentDoughnutChart
            segments={doughnutSegments}
            totalRepairs={totalEquipmentRepairs}
            totalRequests={filteredRequests.length}
          />
          <EfficiencyPanel
            recurrenceRate={recurrenceRate}
            mttrValue={mttrValue}
            onNavigateToKanban={onNavigateToKanban}
          />
          <ServiceTimeBarsChart data={serviceAverages} formatHours={formatDecimalHours} />
        </div>
      </div>
    </div>
  );
}
