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
import { useHeaderToolbar } from "../context/HeaderToolbarContext";
import ReportsMetricStrip from "./reports/ReportsMetricStrip";
import EfficiencyPanel from "./reports/EfficiencyPanel";
import ColumnSummaryPanel from "./reports/ColumnSummaryPanel";
import OperationalLineChart from "./reports/OperationalLineChart";
import EquipmentDoughnutChart, {
  EQUIPMENT_DOUGHNUT_CIRCUMFERENCE,
} from "./reports/EquipmentDoughnutChart";
import ServiceTimeBarsChart from "./reports/ServiceTimeBarsChart";
import { appNoticeError } from "../utils/appNotice";
import { DONUT_WARM_PALETTE } from "./reports/reportsPalette";
import {
  ReportTimeFilter,
  REPORT_TIME_FILTER_LABELS,
  filterRequestsByReportTime,
  isDateInTimeFilter,
  isOrcamentoColumn,
  isReleasedInReportPeriod,
  parseReportDate,
} from "../utils/reportMetrics";

interface ReportsSectionProps {
  requests: MaintenanceRequest[];
  products: ProductCatalog[];
  onNavigateToKanban?: () => void;
}

export default function ReportsSection({ requests, products, onNavigateToKanban }: ReportsSectionProps) {
  const [timeFilter, setTimeFilter] = React.useState<ReportTimeFilter>("all");
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const { setToolbar } = useHeaderToolbar();

  const filteredRequests = React.useMemo(
    () => filterRequestsByReportTime(requests, timeFilter),
    [requests, timeFilter]
  );

  const releasedInPeriod = React.useMemo(
    () => filteredRequests.filter((r) => isReleasedInReportPeriod(r, timeFilter)),
    [filteredRequests, timeFilter]
  );

  // 1. Quantidades por coluna (O.S. com atividade no período)
  const totalOpen = filteredRequests.filter((r) => r.columnId === "solicitacao").length;
  const totalBudget = filteredRequests.filter((r) => isOrcamentoColumn(r.columnId)).length;
  const totalInMaintenance = filteredRequests.filter((r) => r.columnId === "manutencao").length;
  const totalReleased = releasedInPeriod.length;

  // 2. Faturamento — liberados no período (data de liberação)
  let totalBilled = 0;
  releasedInPeriod.forEach((r) => {
    if (r.budget && !r.budget.isWarranty) {
      totalBilled += r.budget.totalFinal;
    }
  });

  // 3. Valor estimado em garantias (O.S. em garantia no período)
  let totalWarrantyValue = 0;
  filteredRequests.forEach((r) => {
    if (r.budget && r.budget.isWarranty) {
      r.budget.products.forEach((bp) => {
        const catProd = products.find((p) => p.id === bp.productId);
        totalWarrantyValue += (catProd ? catProd.baseValue : 300) * bp.quantity;
      });
      r.budget.services.forEach(() => {
        totalWarrantyValue += 150;
      });
    }
  });

  // 4. Tempo médio de resolução (abertura → liberação, só liberados no período)
  let totalDiffMs = 0;
  let countReleasedForAvg = 0;
  releasedInPeriod.forEach((r) => {
    const open = parseReportDate(r.openingDate);
    const released = parseReportDate(r.releasedDate);
    if (open && released) {
      const diffMs = released.getTime() - open.getTime();
      if (diffMs >= 0) {
        totalDiffMs += diffMs;
        countReleasedForAvg += 1;
      }
    }
  });

  const avgDaysDecimal =
    countReleasedForAvg > 0 ? totalDiffMs / countReleasedForAvg / (1000 * 60 * 60 * 24) : 0;
  const avgDaysFormatted = countReleasedForAvg > 0 ? avgDaysDecimal.toFixed(1) : "—";

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
    const circumference = EQUIPMENT_DOUGHNUT_CIRCUMFERENCE;
    return sortedEquipments.map(([name, count], index) => {
      const percentage = totalEquipmentRepairs > 0 ? (count / totalEquipmentRepairs) * 100 : 0;
      const strokePercent = percentage;
      const strokeOffset = (accumulatedPercent / 100) * circumference;
      accumulatedPercent += percentage;
      return {
        name,
        count,
        percent: percentage.toFixed(1),
        color: colors[index % colors.length],
        strokeDash: `${(strokePercent / 100) * circumference} ${circumference}`,
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

  // Taxa de recorrência — clientes com 2+ O.S. no período / total de clientes únicos
  const recurrenceRate = React.useMemo(() => {
    const uniqueClients = Object.keys(clientCounts).length;
    const clientsWithMoreThanOne = (Object.values(clientCounts) as Array<{ company: string; count: number }>).filter(
      (c) => c.count > 1
    ).length;
    if (uniqueClients === 0) return "0.0%";
    return `${((clientsWithMoreThanOne / uniqueClients) * 100).toFixed(1)}%`;
  }, [clientCounts]);

  const mttrValue = React.useMemo(() => {
    let totalMs = 0;
    let count = 0;

    releasedInPeriod.forEach((r) => {
      if (!r.movementHistory?.length) return;

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
    });

    if (count === 0) return "—";

    const avgHours = totalMs / count / (1000 * 60 * 60);
    if (avgHours < 24) {
      return `${avgHours.toFixed(1)}h`;
    }
    return `${(avgHours / 24).toFixed(1)}d`;
  }, [releasedInPeriod]);

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

  const serviceAverages = React.useMemo(() => {
    const serviceMap: Record<string, number[]> = {};

    releasedInPeriod.forEach((r) => {
      if (!r.budget?.services?.length) return;

      const totalMinutes = r.rat?.labor
        ? r.rat.labor.reduce((sum, item) => sum + (item.totalMinutes || 0), 0)
        : 0;
      const totalHours = totalMinutes / 60;

      r.budget.services.forEach((s) => {
        if (!s.description) return;
        if (!serviceMap[s.description]) {
          serviceMap[s.description] = [];
        }
        serviceMap[s.description].push(totalHours);
      });
    });

    const result = Object.entries(serviceMap)
      .map(([description, hoursList]) => {
        const nonZeroHours = hoursList.filter((h) => h > 0);
        const avg =
          nonZeroHours.length > 0
            ? nonZeroHours.reduce((a, b) => a + b, 0) / nonZeroHours.length
            : 0;

        return {
          description,
          avgHours: parseFloat(avg.toFixed(2)),
          count: hoursList.length,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return result.slice(0, 5);
  }, [releasedInPeriod]);

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

    filteredRequests.forEach((r) => {
      if (!isReleasedInReportPeriod(r, timeFilter)) return;
      const rDate = parseReportDate(r.releasedDate);
      if (!rDate) return;

      const m = rDate.getMonth();
      const y = rDate.getFullYear();
      const found = result.find((item) => item.index === m && item.year === y);
      if (found) {
        found.count += 1;
      }
    });
    return result;
  }, [filteredRequests, timeFilter]);

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
      if (r.budget?.isWarranty && r.openingDate && isDateInTimeFilter(r.openingDate, timeFilter)) {
        const opened = parseReportDate(r.openingDate);
        if (!opened) return;
        const idx = bucketIndex(opened);
        if (idx >= 0) warranty[idx] += 1;
      }

      if (!isReleasedInReportPeriod(r, timeFilter)) return;

      const released = parseReportDate(r.releasedDate);
      if (!released) return;

      const idx = bucketIndex(released);
      if (idx >= 0 && r.budget && !r.budget.isWarranty) {
        billing[idx] += r.budget.totalFinal;
      }
      if (idx >= 0) {
        const open = parseReportDate(r.openingDate);
        if (open) {
          const diffDays = (released.getTime() - open.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0) {
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
  }, [filteredRequests, monthlyData, timeFilter]);

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

    const rows = filteredRequests.map((r) => [
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
        <div class="stat-value">${filteredRequests.filter((r) => r.columnId !== "liberado").length} Os</div>
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

  React.useEffect(() => {
    setToolbar(
      <ReportsHeaderToolbar
        header
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        onExportCsv={handleExportCSV}
        onDownloadPdf={handleDownloadReportPdf}
        exportingPdf={exportingPdf}
      />
    );
    return () => setToolbar(null);
  }, [timeFilter, exportingPdf, requests, products, setToolbar]);

  return (
    <div
      id="reports-section-viewport"
      className="app-tab-scroll printable-area reports-page reports-exec"
    >
      <div className="w-full px-6 lg:px-8 py-4 lg:py-5 space-y-5">
        <PageHeader
          variant="page"
          title="Relatórios & Métricas"
          subtitle={`Acompanhamento operacional, financeiro e controle de garantias · ${REPORT_TIME_FILTER_LABELS[timeFilter]} (${filteredRequests.length} O.S.)`}
        />

        <ReportsMetricStrip
          filterKey={timeFilter}
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
              label: "Garantias concedidas",
              value: formatCurrency(totalWarrantyValue),
              icon: <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />,
              variant: "warranty",
              sparklineData: kpiSparklines.warranty,
              hint: `Recorrência: ${recurrenceRate}`,
              hintAlert: true,
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
              label: "Tempo médio de Resolução",
              value: countReleasedForAvg > 0 ? `${avgDaysFormatted} dias` : "—",
              icon: <Clock className="h-4 w-4" strokeWidth={2.25} />,
              variant: "resolution",
              sparklineData: kpiSparklines.resolution,
              hint: `MTTR: ${mttrValue}`,
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
            periodLabel={REPORT_TIME_FILTER_LABELS[timeFilter]}
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
