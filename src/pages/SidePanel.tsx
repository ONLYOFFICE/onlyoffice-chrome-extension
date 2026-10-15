import { useState } from "preact/hooks";

import {
  AgentBar,
  AgentChat,
  AgentDialog,
  Toast,
  useToast,
} from "@features/agents";
import { DeleteConfirm } from "@features/files";

import { useAgents } from "@hooks/useAgents";

import { useI18n } from "@stores/i18n";

import "@styles/extension.css";
import "@styles/sidepanel.css";

export function SidePanel() {
  const { t } = useI18n();
  const { toast, showToast } = useToast();
  const agents = useAgents(showToast);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selected = agents.agents.find(
    (agent) => agent.id === agents.selectedId,
  );

  return (
    <div className="main-container">
      <AgentBar
        agents={agents.agents}
        selectedId={agents.selectedId}
        canCreate={Boolean(agents.authentication)}
        busy={agents.busy}
        onSelect={agents.select}
        onSavePage={agents.savePage}
        onDeleteAgent={() => setConfirmOpen(true)}
        onNewAgent={() => setDialogOpen(true)}
      />
      <AgentChat
        tenant={agents.authentication?.tenant ?? null}
        agentId={agents.selectedId}
        message={agents.status}
        loading={agents.loading}
        getToken={agents.getToken}
      />
      <AgentDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={agents.create}
      />
      <DeleteConfirm
        isOpen={confirmOpen}
        title={`${t("agents.delete_agent")}?`}
        message={t("agents.delete_confirm", { title: selected?.title ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          setConfirmOpen(false);
          agents.deleteAgent();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <Toast toast={toast} />
    </div>
  );
}
