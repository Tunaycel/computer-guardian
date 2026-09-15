import { ShieldCheck } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { Table } from "../../components/Table";

const checks = [
  { check: "Storage capacity", purpose: "Warn when free space is becoming critically low." },
  { check: "Memory and CPU", purpose: "Show current resource pressure without diagnosing malware." },
  { check: "Startup applications", purpose: "Identify entries the user may want to review." },
  { check: "Firewall and security software", purpose: "Report operating-system status only where Windows exposes it." },
  { check: "Operating-system updates", purpose: "Show update status where a reliable provider is available." },
];
const columns = [
  { key: "check", label: "Planned check", render: (row: typeof checks[number]) => row.check },
  { key: "purpose", label: "What it is for", render: (row: typeof checks[number]) => row.purpose },
  { key: "status", label: "Current status", render: () => <span className="muted">Not checked</span> },
];

export function ProtectorPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div><h1 tabIndex={-1}>Protector</h1><p className="page-description">System health and security-awareness checks, where Windows exposes reliable status.</p></div>
        <StatusBadge label="Unavailable" />
      </header>
      <section className="content-panel">
        <EmptyState icon={ShieldCheck} title="Protector is not an antivirus">
          It will summarize specific Windows signals so you know what may need attention. It will not scan for malware, promise protection, or invent a security score.
        </EmptyState>
      </section>
      <section className="content-panel" aria-labelledby="protector-scope-heading">
        <header className="content-panel__header"><h2 id="protector-scope-heading">Planned scope</h2><span className="muted">Later milestone</span></header>
        <Table caption="Planned Protector checks" columns={columns} rows={checks} rowKey={row => row.check} />
        <p className="panel-note">Each provider must identify exactly what it checked, when it checked it, and whether Windows returned a reliable answer. Unsupported signals will remain “Unavailable.”</p>
      </section>
    </div>
  );
}
