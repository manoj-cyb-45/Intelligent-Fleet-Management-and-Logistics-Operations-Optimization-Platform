import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import api from "../services/api";

const pct = (value) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const number = (value, digits = 0) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(digits) : "0";
};

const money = (value, digits = 2) => `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const pdfMoney = (value, digits = 2) => `INR ${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const integer = (value) => Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const distance = (value) => `${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })} km`;

export default function Analytics() {
  const [operational, setOperational] = useState(null);
  const [fleet, setFleet] = useState(null);
  const [fuel, setFuel] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [fuelConsumption, setFuelConsumption] = useState([]);
  const [driverPerformance, setDriverPerformance] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          operationalResponse,
          fleetResponse,
          fuelResponse,
          utilizationResponse,
          fuelConsumptionResponse,
          driverResponse,
          deliveryResponse,
        ] = await Promise.all([
          api.get("/analytics/operational"),
          api.get("/analytics/fleet-performance"),
          api.get("/analytics/fuel"),
          api.get("/analytics/fleet-utilization"),
          api.get("/analytics/fuel-consumption"),
          api.get("/analytics/driver-performance"),
          api.get("/analytics/delivery-performance"),
        ]);

        setOperational(operationalResponse.data);
        setFleet(fleetResponse.data);
        setFuel(fuelResponse.data);
        setUtilization(utilizationResponse.data);
        setFuelConsumption(fuelConsumptionResponse.data);
        setDriverPerformance(driverResponse.data);
        setDelivery(deliveryResponse.data);
      } catch (err) {
        console.error("Analytics loading error:", err);
        setError(
          err?.response?.data?.detail || "Unable to load analytics data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = new Date();
    const dateLabel = generatedAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeLabel = generatedAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const palette = {
      navy: [15, 23, 42],
      navy2: [24, 39, 64],
      blue: [49, 91, 234],
      violet: [139, 92, 246],
      green: [16, 185, 129],
      amber: [245, 158, 11],
      red: [239, 68, 68],
      text: [15, 23, 42],
      muted: [88, 105, 128],
      softText: [124, 140, 160],
      border: [218, 226, 237],
      surface: [247, 249, 252],
      white: [255, 255, 255],
      blueSoft: [239, 246, 255],
      violetSoft: [245, 243, 255],
      greenSoft: [236, 253, 245],
      amberSoft: [255, 247, 237],
    };

    let y = 16;

    const setText = (color) => doc.setTextColor(...color);
    const setFill = (color) => doc.setFillColor(...color);
    const setDraw = (color) => doc.setDrawColor(...color);

    const roundedRect = (x, top, w, h, radius, fill, stroke = null) => {
      setFill(fill);
      if (stroke) setDraw(stroke);
      doc.roundedRect(x, top, w, h, radius, radius, stroke ? "FD" : "F");
    };

    const footer = () => {
      setFill(palette.navy);
      doc.rect(0, pageHeight - 6, pageWidth, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      setText([203, 213, 225]);
      doc.text("FleetFlow  •  Fleet Analytics", margin, pageHeight - 2.2);
      doc.text(`Generated ${dateLabel} ${timeLabel}`, pageWidth / 2, pageHeight - 2.2, { align: "center" });
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 2.2, { align: "right" });
    };

    const pageHeader = () => {
      setFill(palette.navy);
      doc.rect(0, 0, pageWidth, 5, "F");
      footer();
    };

    const ensureSpace = (heightNeeded) => {
      if (y + heightNeeded > pageHeight - 13) {
        doc.addPage();
        y = 16;
        pageHeader();
      }
    };

    const addSectionHeading = (kicker, title, color = palette.blue) => {
      ensureSpace(17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setText(color);
      doc.text(kicker.toUpperCase(), margin, y);
      y += 5;
      doc.setFontSize(14);
      setText(palette.text);
      doc.text(title, margin, y);
      y += 2;
      setDraw(palette.border);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    };

    const addMetricCards = () => {
      const cards = [
        { label: "TRIP COMPLETION", value: `${number(completionRate, 1)}%`, note: `${integer(operational?.completed_trips)} completed trips`, color: palette.blue, soft: palette.blueSoft },
        { label: "FLEET UTILIZATION", value: `${number(utilizationRate, 1)}%`, note: `${integer(utilization?.utilized_vehicles)} vehicles utilized`, color: palette.violet, soft: palette.violetSoft },
        { label: "DELIVERY RATE", value: `${number(deliveryRate, 1)}%`, note: `${integer(delivery?.delivered_shipments)} shipments delivered`, color: palette.green, soft: palette.greenSoft },
        { label: "FUEL COST", value: `INR ${integer(fuel?.total_cost)}`, note: `${pdfMoney(fuel?.average_cost_per_unit)} average per unit`, color: palette.amber, soft: palette.amberSoft },
      ];
      const gap = 4;
      const cardWidth = (contentWidth - gap) / 2;
      const cardHeight = 27;

      cards.forEach((card, index) => {
        if (index === 2) y += 4;
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = margin + column * (cardWidth + gap);
        const top = y + row * (cardHeight + gap);
        roundedRect(x, top, cardWidth, cardHeight, 2.5, palette.white, palette.border);
        setFill(card.soft);
        doc.circle(x + cardWidth - 9, top + 14, 9, "F");
        setFill(card.color);
        doc.circle(x + cardWidth - 9, top + 14, 2.3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        setText(palette.muted);
        doc.text(card.label, x + 5, top + 7);
        doc.setFontSize(15);
        setText(palette.text);
        doc.text(card.value, x + 5, top + 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setText(palette.softText);
        doc.text(card.note, x + 5, top + 22);
      });
      y += cardHeight * 2 + gap + 8;
    };

    const addKeyValueGrid = (rows) => {
      const columns = 2;
      const gap = 4;
      const cellWidth = (contentWidth - gap) / columns;
      const cellHeight = 14;
      const totalRows = Math.ceil(rows.length / columns);
      ensureSpace(totalRows * (cellHeight + gap) + 2);

      rows.forEach(([label, value], index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = margin + column * (cellWidth + gap);
        const top = y + row * (cellHeight + gap);
        roundedRect(x, top, cellWidth, cellHeight, 1.8, palette.surface, palette.border);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        setText(palette.muted);
        doc.text(String(label), x + 4, top + 5.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        setText(palette.text);
        doc.text(String(value ?? "0"), x + 4, top + 10.5);
      });
      y += totalRows * (cellHeight + gap) + 5;
    };

    const addTable = (columns, rows, widths, options = {}) => {
      const headerHeight = 9;
      const baseRowHeight = 8;
      const fontSize = options.fontSize || 7.1;
      const normalizedWidths = widths.map((width) => contentWidth * width);

      const drawHeader = () => {
        roundedRect(margin, y, contentWidth, headerHeight, 2, palette.navy);
        let x = margin;
        columns.forEach((column, index) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.4);
          setText(palette.white);
          doc.text(String(column).toUpperCase(), x + 3, y + 5.7);
          x += normalizedWidths[index];
        });
        y += headerHeight;
      };

      ensureSpace(headerHeight + baseRowHeight + 3);
      drawHeader();

      rows.forEach((row, rowIndex) => {
        const wrapped = row.map((value, index) => {
          const text = String(value ?? "—");
          return doc.splitTextToSize(text, normalizedWidths[index] - 6);
        });
        const lineCount = Math.max(...wrapped.map((lines) => lines.length), 1);
        const rowHeight = Math.max(baseRowHeight, lineCount * 3.6 + 4.2);

        if (y + rowHeight > pageHeight - 13) {
          doc.addPage();
          y = 16;
          pageHeader();
          drawHeader();
        }

        setFill(rowIndex % 2 === 0 ? palette.white : palette.surface);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
        setDraw(palette.border);
        doc.setLineWidth(0.2);
        doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

        let x = margin;
        wrapped.forEach((lines, index) => {
          doc.setFont("helvetica", index === 0 ? "bold" : "normal");
          doc.setFontSize(fontSize);
          setText(index === 0 ? palette.text : palette.muted);
          doc.text(lines, x + 3, y + 4.8, { lineHeightFactor: 1.15 });
          x += normalizedWidths[index];
        });
        y += rowHeight;
      });
      y += 7;
    };

    // Report cover.
    setFill(palette.navy);
    doc.roundedRect(margin, y, contentWidth, 47, 4, 4, "F");
    setFill(palette.blue);
    doc.roundedRect(margin + 8, y + 9, 18, 18, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(palette.white);
    doc.text("FF", margin + 17, y + 20.5, { align: "center" });
    doc.setFontSize(8);
    doc.text("FLEETFLOW", margin + 33, y + 12);
    doc.setFontSize(21);
    doc.text("Fleet Analytics Report", margin + 33, y + 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    setText([203, 213, 225]);
    doc.text("Operational efficiency, fleet health, fuel usage and delivery outcomes", margin + 33, y + 31);
    doc.text(`Generated ${dateLabel} at ${timeLabel}`, margin + 33, y + 38);
    y += 56;

    pageHeader();
    addMetricCards();

    addSectionHeading("Trip Flow", "Operational Analytics", palette.blue);
    addKeyValueGrid([
      ["Total Trips", integer(operational?.total_trips)],
      ["Scheduled Trips", integer(operational?.scheduled_trips)],
      ["In Progress", integer(operational?.in_progress_trips)],
      ["Completed Trips", integer(operational?.completed_trips)],
      ["Cancelled Trips", integer(operational?.cancelled_trips)],
      ["Completion Rate", `${number(completionRate, 1)}%`],
    ]);

    addSectionHeading("Asset Health", "Fleet Performance", palette.violet);
    addKeyValueGrid([
      ["Total Vehicles", integer(fleet?.total_vehicles)],
      ["Available Vehicles", integer(fleet?.available_vehicles)],
      ["Active Vehicles", integer(fleet?.active_vehicles)],
      ["Maintenance Vehicles", integer(fleet?.maintenance_vehicles)],
      ["Average Mileage", distance(fleet?.average_mileage)],
      ["Average Fuel Level", `${number(fuelLevel, 1)}%`],
    ]);

    addSectionHeading("Service Level", "Delivery Performance", palette.green);
    addKeyValueGrid([
      ["Total Shipments", integer(delivery?.total_shipments)],
      ["Delivered", integer(delivery?.delivered_shipments)],
      ["In Transit", integer(delivery?.in_transit_shipments)],
      ["Pending", integer(delivery?.pending_shipments)],
      ["Cancelled", integer(delivery?.cancelled_shipments)],
      ["Delivery Rate", `${number(deliveryRate, 1)}%`],
    ]);

    addSectionHeading("Cost & Usage", "Fuel Consumption", palette.amber);
    addTable(
      ["Vehicle", "Records", "Quantity", "Total Cost"],
      fuelConsumption.map((item) => [
        item.vehicle_id,
        integer(item.fuel_records),
        `${number(item.total_quantity, 0)} L`,
        pdfMoney(item.total_cost),
      ]),
      [0.24, 0.18, 0.27, 0.31]
    );

    addSectionHeading("Trip Execution", "Driver Performance", palette.blue);
    addTable(
      ["Driver", "Trips", "Completed", "Cancelled", "Rate"],
      driverPerformance.map((driver) => [
        driver.driver_id,
        integer(driver.total_trips),
        integer(driver.completed_trips),
        integer(driver.cancelled_trips),
        `${number(driver.completion_rate, 1)}%`,
      ]),
      [0.25, 0.18, 0.20, 0.18, 0.19]
    );

    // Finalize consistent footer on every page.
    for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
      doc.setPage(page);
      pageHeader();
    }

    doc.save(`fleet-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const operationalSheet = XLSX.utils.json_to_sheet([{
      "Total Trips": operational?.total_trips ?? 0,
      "Scheduled Trips": operational?.scheduled_trips ?? 0,
      "In Progress Trips": operational?.in_progress_trips ?? 0,
      "Completed Trips": operational?.completed_trips ?? 0,
      "Cancelled Trips": operational?.cancelled_trips ?? 0,
      "Completion Rate": `${operational?.completion_rate ?? 0}%`,
    }]);

    const fleetSheet = XLSX.utils.json_to_sheet([{
      "Total Vehicles": fleet?.total_vehicles ?? 0,
      "Available Vehicles": fleet?.available_vehicles ?? 0,
      "Active Vehicles": fleet?.active_vehicles ?? 0,
      "Maintenance Vehicles": fleet?.maintenance_vehicles ?? 0,
      "Average Mileage": fleet?.average_mileage ?? 0,
      "Average Fuel Level": `${fleet?.average_fuel_level ?? 0}%`,
    }]);

    const fuelSheet = XLSX.utils.json_to_sheet([{
      "Total Fuel Quantity": fuel?.total_quantity ?? 0,
      "Total Fuel Cost": fuel?.total_cost ?? 0,
      "Average Cost Per Unit": fuel?.average_cost_per_unit ?? 0,
    }]);

    const deliverySheet = XLSX.utils.json_to_sheet([{
      "Total Shipments": delivery?.total_shipments ?? 0,
      "Delivered Shipments": delivery?.delivered_shipments ?? 0,
      "In Transit Shipments": delivery?.in_transit_shipments ?? 0,
      "Pending Shipments": delivery?.pending_shipments ?? 0,
      "Cancelled Shipments": delivery?.cancelled_shipments ?? 0,
      "Delivery Rate": `${delivery?.delivery_rate ?? 0}%`,
    }]);

    const fuelConsumptionSheet = XLSX.utils.json_to_sheet(
      fuelConsumption.map((item) => ({
        "Vehicle ID": item.vehicle_id,
        "Fuel Records": item.fuel_records ?? 0,
        Quantity: item.total_quantity ?? 0,
        "Total Cost": item.total_cost ?? 0,
      }))
    );

    const driverSheet = XLSX.utils.json_to_sheet(
      driverPerformance.map((driver) => ({
        "Driver ID": driver.driver_id,
        "Total Trips": driver.total_trips ?? 0,
        "Completed Trips": driver.completed_trips ?? 0,
        "Cancelled Trips": driver.cancelled_trips ?? 0,
        "Completion Rate": `${driver.completion_rate ?? 0}%`,
      }))
    );

    XLSX.utils.book_append_sheet(workbook, operationalSheet, "Operational");
    XLSX.utils.book_append_sheet(workbook, fleetSheet, "Fleet Performance");
    XLSX.utils.book_append_sheet(workbook, fuelSheet, "Fuel Analytics");
    XLSX.utils.book_append_sheet(workbook, deliverySheet, "Delivery Performance");
    XLSX.utils.book_append_sheet(workbook, fuelConsumptionSheet, "Fuel Consumption");
    XLSX.utils.book_append_sheet(workbook, driverSheet, "Driver Performance");
    XLSX.writeFile(workbook, `fleet-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-state-card">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error-card">{error}</div>
      </div>
    );
  }

  const completionRate = pct(operational?.completion_rate);
  const utilizationRate = pct(utilization?.utilization_rate);
  const deliveryRate = pct(delivery?.delivery_rate);
  const fuelLevel = pct(fleet?.average_fuel_level);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="analytics-heading-group">
          <span className="analytics-eyebrow">PERFORMANCE CENTER</span>
          <h1 className="analytics-title">Fleet Analytics</h1>
          <p className="analytics-subtitle">
            Monitor operational efficiency, fleet utilization, fuel performance and delivery outcomes.
          </p>
        </div>

        <div className="analytics-export-actions">
          <button type="button" className="analytics-export-button analytics-export-secondary" onClick={exportPDF}>
            Export PDF
          </button>
          <button type="button" className="analytics-export-button analytics-export-primary" onClick={exportExcel}>
            Export Excel
          </button>
        </div>
      </header>

      <section className="analytics-primary-grid" aria-label="Analytics overview">
        <MetricCard title="Trip Completion" value={`${number(completionRate, 1)}%`} subtitle={`${operational?.completed_trips ?? 0} completed trips`} progress={completionRate} tone="blue" />
        <MetricCard title="Fleet Utilization" value={`${number(utilizationRate, 1)}%`} subtitle={`${utilization?.utilized_vehicles ?? 0} vehicles utilized`} progress={utilizationRate} tone="violet" />
        <MetricCard title="Delivery Rate" value={`${number(deliveryRate, 1)}%`} subtitle={`${delivery?.delivered_shipments ?? 0} shipments delivered`} progress={deliveryRate} tone="green" />
        <MetricCard title="Fuel Cost" value={money(fuel?.total_cost)} subtitle={`${money(fuel?.average_cost_per_unit)} average per unit`} tone="amber" />
      </section>

      <section className="analytics-secondary-grid" aria-label="Supporting metrics">
        <MetricCard compactSecondary title="Total Trips" value={integer(operational?.total_trips)} subtitle={`${operational?.in_progress_trips ?? 0} currently in progress`} compact />
        <MetricCard compactSecondary title="Total Vehicles" value={integer(fleet?.total_vehicles)} subtitle={`${fleet?.available_vehicles ?? 0} available`} compact />
        <MetricCard compactSecondary title="Fuel Consumed" value={`${number(fuel?.total_quantity, 0)} L`} subtitle="Total recorded quantity" compact />
        <MetricCard compactSecondary title="Avg. Fuel Level" value={`${number(fuelLevel, 1)}%`} subtitle={`${fleet?.maintenance_vehicles ?? 0} vehicles in maintenance`} compact />
      </section>

      <section className="analytics-overview-grid">
        <SectionCard title="Operational Analytics" kicker="TRIP FLOW">
          <div className="analytics-progress-block">
            <div className="analytics-progress-heading">
              <span>Completion rate</span>
              <strong>{number(completionRate, 1)}%</strong>
            </div>
            <ProgressBar value={completionRate} tone="blue" />
          </div>
          <DataRow label="Total Trips" value={operational?.total_trips} />
          <DataRow label="Scheduled" value={operational?.scheduled_trips} />
          <DataRow label="In Progress" value={operational?.in_progress_trips} />
          <DataRow label="Completed" value={operational?.completed_trips} />
          <DataRow label="Cancelled" value={operational?.cancelled_trips} />
        </SectionCard>

        <SectionCard title="Fleet Performance" kicker="ASSET HEALTH">
          <div className="analytics-progress-block">
            <div className="analytics-progress-heading">
              <span>Average fuel level</span>
              <strong>{number(fuelLevel, 1)}%</strong>
            </div>
            <ProgressBar value={fuelLevel} tone="green" />
          </div>
          <DataRow label="Total Vehicles" value={fleet?.total_vehicles} />
          <DataRow label="Available" value={fleet?.available_vehicles} />
          <DataRow label="Active" value={fleet?.active_vehicles} />
          <DataRow label="Maintenance" value={fleet?.maintenance_vehicles} />
          <DataRow label="Average Mileage" value={distance(fleet?.average_mileage)} />
        </SectionCard>
      </section>

      <SectionCard title="Delivery Performance" kicker="SERVICE LEVEL">
        <div className="analytics-delivery-layout">
          <div className="analytics-ring-wrap">
            <div className="analytics-ring" style={{ "--progress": `${deliveryRate * 3.6}deg` }}>
              <div className="analytics-ring-inner">
                <strong>{number(deliveryRate, 1)}%</strong>
                <span>Delivered</span>
              </div>
            </div>
          </div>

          <div className="analytics-delivery-stats">
            <DataRow label="Total Shipments" value={delivery?.total_shipments} />
            <DataRow label="Delivered" value={delivery?.delivered_shipments} />
            <DataRow label="In Transit" value={delivery?.in_transit_shipments} />
            <DataRow label="Pending" value={delivery?.pending_shipments} />
            <DataRow label="Cancelled" value={delivery?.cancelled_shipments} />
          </div>
        </div>
      </SectionCard>

      <section className="analytics-report-grid">
        <SectionCard title="Fuel Consumption" kicker="COST & USAGE">
          {fuelConsumption.length === 0 ? (
            <EmptyState message="No fuel consumption records available." />
          ) : (
            <DataTable className="analytics-table" columns={["Vehicle ID", "Records", "Quantity", "Total Cost"]}>
              {fuelConsumption.map((item) => (
                <tr key={item.vehicle_id}>
                  <td>{item.vehicle_id}</td>
                  <td>{item.fuel_records ?? 0}</td>
                  <td>{number(item.total_quantity, 0)} L</td>
                  <td>{money(item.total_cost)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard title="Driver Performance" kicker="TRIP EXECUTION">
          {driverPerformance.length === 0 ? (
            <EmptyState message="No driver performance data available." />
          ) : (
            <DataTable className="analytics-table" columns={["Driver", "Trips", "Completed", "Cancelled", "Rate"]}>
              {driverPerformance.map((driver) => (
                <tr key={driver.driver_id}>
                  <td>{driver.driver_id}</td>
                  <td>{driver.total_trips ?? 0}</td>
                  <td>{driver.completed_trips ?? 0}</td>
                  <td>{driver.cancelled_trips ?? 0}</td>
                  <td><span className="analytics-rate-badge">{number(driver.completion_rate, 1)}%</span></td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

function MetricCard({ title, value, subtitle, progress, tone = "blue", compact = false, compactSecondary = false }) {
  return (
    <article className={`analytics-metric-card analytics-metric-${tone}${compact ? " analytics-metric-compact" : ""}${compactSecondary ? " analytics-metric-secondary" : ""}`}>
      <div className="analytics-metric-topline">
        <span className="analytics-metric-title">{title}</span>
        <span className="analytics-metric-dot" aria-hidden="true" />
      </div>
      <strong className="analytics-metric-value">{value}</strong>
      <span className="analytics-metric-subtitle">{subtitle}</span>
      {progress !== undefined && <ProgressBar value={progress} tone={tone} />}
    </article>
  );
}

function SectionCard({ title, kicker, children }) {
  return (
    <section className="analytics-section-card">
      <div className="analytics-section-heading">
        <div>
          {kicker && <span className="analytics-section-kicker">{kicker}</span>}
          <h2 className="analytics-section-title">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function DataRow({ label, value }) {
  return (
    <div className="analytics-data-row">
      <span className="analytics-data-label">{label}</span>
      <strong className="analytics-data-value">{value ?? 0}</strong>
    </div>
  );
}

function ProgressBar({ value, tone = "blue" }) {
  return (
    <div className={`analytics-progress analytics-progress-${tone}`}>
      <span style={{ width: `${pct(value)}%` }} />
    </div>
  );
}

function DataTable({ columns, children }) {
  return (
    <div className="analytics-table-wrapper">
      <table className="analytics-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="analytics-empty-state">{message}</div>;
}
