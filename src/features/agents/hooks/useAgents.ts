import { useCallback, useEffect, useState } from 'preact/hooks';

import { useI18n } from '@stores/i18n';
import { LocalizedError, errorMessage } from '@i18n/errors';

import { runtime } from '@utils/browser';
import { Storage } from '@utils/storage';
import { AIAgent, DocspaceAPI } from '@utils/http';

import { saveKnowledge } from '@features/agents/api/knowledge';
import type { ToastState } from '@features/agents/hooks/useToast';

import { SELECTED_AGENT_KEY } from '@config';

interface Authentication {
  accessToken: string;
  tenant: string;
}

const storage = new Storage();
const api = new DocspaceAPI(storage);

async function requestAuthentication(): Promise<Authentication | null> {
  const authentication = await runtime
    .sendMessage({ action: 'getAccessToken' })
    .catch(() => null);
  return authentication?.accessToken && authentication.tenant
    ? authentication
    : null;
}

async function requireAuthentication(): Promise<Authentication> {
  const authentication = await requestAuthentication();
  if (!authentication) throw new LocalizedError('agents.sign_in');
  return authentication;
}

const rememberAgent = (agentId: number) => storage.set({ [SELECTED_AGENT_KEY]: agentId });

export function useAgents(
  showToast: (message: string, state: ToastState) => void,
) {
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('');
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [authentication, setAuthentication] = useState<Authentication | null>(null);

  const showAgents = useCallback((list: AIAgent[], agent: AIAgent | undefined) => {
    setAgents(list);
    setSelectedId(agent?.id ?? null);
    setStatus(agent ? '' : t('agents.no_agents'));
    if (agent) rememberAgent(agent.id);
  }, [t]);

  const load = useCallback(
    async (preferredId?: number) => {
      setStatus('');
      setAgents([]);
      setLoading(true);
      setSelectedId(null);

      const current = await requestAuthentication();
      setAuthentication(current);

      if (!current) {
        setStatus(t('agents.sign_in'));
        setLoading(false);
        return;
      }

      try {
        const list = await api.getChatAgents(current.accessToken, current.tenant);
        const { [SELECTED_AGENT_KEY]: savedId } = await storage.get<Record<string, number>>([SELECTED_AGENT_KEY]);
        showAgents(list, list.find((item) => item.id === (preferredId ?? savedId)) ?? list[0]);
      } catch (error) {
        setStatus(t('agents.agents_failed', { message: errorMessage(error, t) }));
      } finally {
        setLoading(false);
      }
    },
    [t, showAgents],
  );

  useEffect(() => {
    load();

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const change = changes.docspace_authentication;
      if (area === 'local' && change && Boolean(change.oldValue?.accessToken) !== Boolean(change.newValue?.accessToken)) {
        load();
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [load]);

  const perform = async <T>(
    progress: string,
    action: (auth: Authentication) => Promise<T>,
    done: (result: T) => string,
    failed: 'agents.save_failed' | 'agents.create_failed' | 'agents.delete_failed',
  ): Promise<boolean> => {
    setBusy(true);
    showToast(progress, 'progress');
    try {
      const result = await action(await requireAuthentication());
      showToast(done(result), 'done');
      return true;
    } catch (error) {
      showToast(t(failed, { message: errorMessage(error, t) }), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const select = (agentId: number) => {
    setSelectedId(agentId);
    rememberAgent(agentId);
  };

  const savePage = async () => {
    if (selectedId === null) return;
    await perform(
      t('agents.saving_page'),
      (auth) => saveKnowledge(api, auth.accessToken, auth.tenant, selectedId),
      (name) => t('agents.page_saved', { name }),
      'agents.save_failed',
    );
  };

  const create = (title: string, prompt: string): Promise<boolean> => perform(
    t('agents.loading_settings'),
    async (auth) => {
      const profileId = await api.getDefaultChatProfileId(auth.accessToken, auth.tenant);
      showToast(t('agents.creating', { title }), 'progress');
      const agent = await api.createAgent(auth.accessToken, auth.tenant, title, profileId, prompt);
      await load(agent.id);
      return agent;
    },
    (agent) => t('agents.created', { title: agent.title }),
    'agents.create_failed',
  );

  const deleteAgent = async () => {
    const agent = agents.find((item) => item.id === selectedId);
    if (!agent) return;

    await perform(
      t('agents.deleting', { title: agent.title }),
      async (auth) => {
        await api.deleteAgent(auth.accessToken, auth.tenant, agent.id);
        const rest = agents.filter((item) => item.id !== agent.id);
        showAgents(rest, rest[0]);
      },
      () => t('agents.deleted', { title: agent.title }),
      'agents.delete_failed',
    );
  };

  const getToken = useCallback(async () => (await requireAuthentication()).accessToken, []);

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
