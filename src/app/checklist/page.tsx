import { ManualChecklist } from "@/components/ManualChecklist";

export default function ChecklistPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Checklist</h1>
          <p>Manual checkout prep</p>
        </div>
      </header>
      <ManualChecklist />
    </div>
  );
}
