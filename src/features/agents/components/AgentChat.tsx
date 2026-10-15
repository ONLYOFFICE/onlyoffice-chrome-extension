import { FunctionalComponent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { SDK } from '@onlyoffice/docspace-sdk-js';

import { Spinner } from '@components/Spinner';

import { useI18n } from '@stores/i18n';

import './chat.css';

const FRAME_ID = 'ds-chat';

interface AgentChatProps {
  readonly tenant: string | null;
  readonly agentId: number | null;
  readonly message: string;
  readonly loading: boolean;
  readonly getToken: () => Promise<string>;
}

export const AgentChat: FunctionalComponent<AgentChatProps> = ({
  tenant,
  agentId,
  message,
  loading,
  getToken,
}) => {
  const { t } = useI18n();
  const [status, setStatus] = useState('');
  const [frameLoading, setFrameLoading] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = frame.current;
    if (!container || !tenant || agentId === null) return undefined;

    const placeholder = document.createElement('div');
    placeholder.id = FRAME_ID;
    container.replaceChildren(placeholder);

    setStatus('');
    setFrameLoading(true);
    const fail = (text: string) => {
      setFrameLoading(false);
      setStatus(text);
    };

    const instance = new SDK().initChat({
      frameId: FRAME_ID,
      src: tenant,
      agentId,
      theme: 'System',
      checkCSP: false,
      getToken,
      events: {
        onContentReady: () => setFrameLoading(false),
        onNoAccess: () => fail(t('agents.no_access')),
        onAuthError: () => fail(t('agents.session_expired')),
        onAppError: (error: string) => fail(t('agents.agent_failed', { message: error })),
      },
    });

    return () => {
      instance.destroyFrame();
      container.replaceChildren();
    };
  }, [tenant, agentId, getToken, t]);

  const text = message || status;
  const busy = !text && (loading || frameLoading);

  return (
    <div className="agent-chat">
      <div className="agent-chat__frame" ref={frame} />
      {(text || busy) && (
        <div className="agent-chat__status">
          {text || <Spinner size="large" color="darker" />}
        </div>
      )}
    </div>
  );
};
