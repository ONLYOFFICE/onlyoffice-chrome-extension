import { useCallback, useEffect, useState } from "preact/hooks";

import { useI18n } from "@stores/i18n";

import { runtime } from "@utils/browser";
import { Storage } from "@utils/storage";
import { AIAgent, DocspaceAPI } from "@utils/http";

import { saveKnowledge } from "@features/agents/api/knowledge";
import type { ToastState } from "@features/agents/hooks/useToast";

import { SELECTED_AGENT_KEY } from "@config";

interface Authentication {
  accessToken: string;
  tenant: string;
}

const storage = new Storage();
const api = new DocspaceAPI(storage);

async function requestAuthentication(): Promise<Authentication | null> {
  const authentication = await runtime
    .sendMessage({ action: "getAccessToken" })
    .catch(() => null);
  return authentication?.accessToken && authentication.tenant
    ? authentication
    : null;
}

export function useAgents(
  showToast: (message: string, state: ToastState) => void,
) {
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [authentication, setAuthentication] = useState<Authentication | null>(
    null,
  );

  const load = useCallback(
    async (preferredId?: number) => {
      setStatus("");
      setAgents([]);
      setLoading(true);
      setSelectedId(null);

      const currentAuthentication = await requestAuthentication();
      setAuthentication(currentAuthentication);

      if (!currentAuthentication) {
        setStatus(t("agents.sign_in"));
        setLoading(false);
        return;
      }

      try {
        const list = await api.getChatAgents(
          currentAuthentication.accessToken,
          currentAuthentication.tenant,
        );
        const { [SELECTED_AGENT_KEY]: savedId } = await storage.get<
          Record<string, number>
        >([SELECTED_AGENT_KEY]);
        const agent =
          list.find((item) => item.id === (preferredId ?? savedId)) ?? list[0];

        setAgents(list);
        setSelectedId(agent?.id ?? null);
        setStatus(agent ? "" : t("agents.no_agents"));

        if (agent) await storage.set({ [SELECTED_AGENT_KEY]: agent.id });
      } catch (error) {
        setStatus(
          t("agents.agents_failed", { message: (error as Error).message }),
        );
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    load();

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      const change = changes.docspace_authentication;
      if (
        area === "local" &&
        change &&
        Boolean(change.oldValue?.accessToken) !==
          Boolean(change.newValue?.accessToken)
      ) {
        load();
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [load]);

  const select = (agentId: number) => {
    setSelectedId(agentId);
    storage.set({ [SELECTED_AGENT_KEY]: agentId });
  };

  const savePage = async () => {
    const currentAuthentication = await requestAuthentication();
    if (!currentAuthentication || selectedId === null) return;

    setBusy(true);
    showToast(t("agents.saving_page"), "progress");

    try {
      const name = await saveKnowledge(
        api,
        currentAuthentication.accessToken,
        currentAuthentication.tenant,
        selectedId,
      );
      showToast(t("agents.page_saved", { name }), "done");
    } catch (error) {
      showToast(
        t("agents.save_failed", { message: (error as Error).message }),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const create = async (title: string, prompt: string): Promise<boolean> => {
    setBusy(true);
    try {
      const currentAuthentication = await requestAuthentication();
      if (!currentAuthentication) throw new Error(t("agents.sign_in"));

      showToast(t("agents.loading_settings"), "progress");

      const profileId = await api.getDefaultChatProfileId(
        currentAuthentication.accessToken,
        currentAuthentication.tenant,
      );

      showToast(t("agents.creating", { title }), "progress");

      const agent = await api.createAgent(
        currentAuthentication.accessToken,
        currentAuthentication.tenant,
        title,
        profileId,
        prompt,
      );

      showToast(t("agents.created", { title: agent.title }), "done");

      await load(agent.id);
      return true;
    } catch (error) {
      showToast(
        t("agents.create_failed", { message: (error as Error).message }),
        "error",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const deleteAgent = async () => {
    const agent = agents.find((item) => item.id === selectedId);
    const currentAuthentication = await requestAuthentication();
    if (!agent || !currentAuthentication) return;

    setBusy(true);
    showToast(t("agents.deleting", { title: agent.title }), "progress");
    try {
      await api.deleteAgent(
        currentAuthentication.accessToken,
        currentAuthentication.tenant,
        agent.id,
      );

      const rest = agents.filter((item) => item.id !== agent.id);

      setAgents(rest);
      setSelectedId(rest[0]?.id ?? null);
      setStatus(rest.length ? "" : t("agents.no_agents"));

      if (rest[0]) await storage.set({ [SELECTED_AGENT_KEY]: rest[0].id });

      showToast(t("agents.deleted", { title: agent.title }), "done");
    } catch (error) {
      showToast(
        t("agents.delete_failed", { message: (error as Error).message }),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const getToken = useCallback(async () => {
    const fresh = await requestAuthentication();
    if (!fresh) throw new Error("not_signed_in");
    return fresh.accessToken;
  }, []);

  return {
    authentication,
    agents,
    selectedId,
    status,
    loading,
    busy,
    select,
    savePage,
    create,
    deleteAgent,
    getToken,
  };
}
