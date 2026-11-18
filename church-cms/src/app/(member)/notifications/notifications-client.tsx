'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { ApiError, apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Card,
  CardSubtitle,
  CardTitle,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { MemberPreferences } from '../_shared/api-types';

type Channel = 'smsOptIn' | 'whatsappOptIn' | 'emailOptIn';

interface ChannelMeta {
  key: Channel;
  label: string;
  description: string;
  icon: Parameters<typeof Icon>[0]['name'];
}

export function NotificationsClient(): React.ReactElement {
  const t = useTranslations('MemberNotifications');
  const { push } = useToast();
  const channels: readonly ChannelMeta[] = [
    {
      key: 'smsOptIn',
      label: t('sms'),
      description: t('smsDesc'),
      icon: 'phone',
    },
    {
      key: 'whatsappOptIn',
      label: t('whatsapp'),
      description: t('whatsappDesc'),
      icon: 'chat',
    },
    {
      key: 'emailOptIn',
      label: t('email'),
      description: t('emailDesc'),
      icon: 'mail',
    },
  ];
  const [prefs, setPrefs] = useState<MemberPreferences | null>(null);
  const [original, setOriginal] = useState<MemberPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<MemberPreferences>('/api/v1/communication-preferences/me')
      .then((data) => {
        if (cancelled) return;
        setPrefs(data);
        setOriginal(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          // Backend returns defaults on 404 per contract, but guard anyway.
          const fallback: MemberPreferences = {
            personId: '',
            smsOptIn: true,
            whatsappOptIn: true,
            emailOptIn: true,
          };
          setPrefs(fallback);
          setOriginal(fallback);
        } else if (e instanceof ApiError) {
          setLoadError(e.message);
        } else {
          setLoadError(t('connection'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const dirty = useMemo(() => {
    if (!prefs || !original) return false;
    return (
      prefs.smsOptIn !== original.smsOptIn ||
      prefs.whatsappOptIn !== original.whatsappOptIn ||
      prefs.emailOptIn !== original.emailOptIn
    );
  }, [prefs, original]);

  async function handleSave(): Promise<void> {
    if (!prefs) return;
    setSaving(true);
    try {
      const updated = await apiFetch<MemberPreferences>(
        '/api/v1/communication-preferences/me',
        {
          method: 'PUT',
          json: {
            smsOptIn: prefs.smsOptIn,
            whatsappOptIn: prefs.whatsappOptIn,
            emailOptIn: prefs.emailOptIn,
          },
        },
      );
      setPrefs(updated);
      setOriginal(updated);
      push({
        tone: 'success',
        title: t('saved'),
        message: t('followChoices'),
      });
    } catch (e) {
      if (e instanceof ApiError) {
        push({
          tone: 'danger',
          title: t('saveFail'),
          message: e.message || t('tryAgainMoment'),
        });
      } else {
        push({ tone: 'danger', message: t('connection') });
      }
    } finally {
      setSaving(false);
    }
  }

  const noChannels =
    prefs && !prefs.smsOptIn && !prefs.whatsappOptIn && !prefs.emailOptIn;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} lede={t('lede')} />

      {loading ? (
        <Skeleton size="block" className="h-72 w-full" radius="md" />
      ) : loadError && !prefs ? (
        <EmptyState
          icon="bell"
          tone="peach"
          title={t('loadFail')}
          description={loadError}
        />
      ) : prefs ? (
        <>
          <Panel title={t('channels')} subtitle={t('channelsSubtitle')}>
            <div className="flex flex-col gap-3">
              {channels.map((ch) => (
                <ChannelToggle
                  key={ch.key}
                  meta={ch}
                  value={prefs[ch.key]}
                  onChange={(event) =>
                    setPrefs({ ...prefs, [ch.key]: event.target.checked })
                  }
                  ariaLabel={t('channelState', {
                    label: ch.label,
                    state: prefs[ch.key] ? t('on') : t('off'),
                  })}
                />
              ))}
            </div>
          </Panel>

          {noChannels ? (
            <Card
              padding="md"
              className="flex items-start gap-3 bg-[color:var(--warning-soft)]"
            >
              <Icon
                name="alert"
                size={20}
                className="mt-0.5 text-[color:var(--warning-ink)]"
              />
              <div>
                <CardTitle>{t('missTitle')}</CardTitle>
                <CardSubtitle>{t('missBody')}</CardSubtitle>
              </div>
            </Card>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!dirty || saving}
            >
              {dirty ? t('savePreferences') : t('allSaved')}
            </Button>
            {dirty && original ? (
              <Button variant="ghost" onClick={() => setPrefs(original)}>
                {t('discard')}
              </Button>
            ) : null}
          </div>

          <Card padding="md" className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md tone-sage"
            >
              <Icon name="shield" size={18} />
            </span>
            <div>
              <CardTitle>{t('safetyTitle')}</CardTitle>
              <CardSubtitle>{t('safetyBody')}</CardSubtitle>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function ChannelToggle({
  meta,
  value,
  onChange,
  ariaLabel,
}: {
  meta: ChannelMeta;
  value: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  ariaLabel: string;
}): ReactNode {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-4 hover:bg-surface-muted/60 focus-within:ring-2 focus-within:ring-[color:var(--ring)] focus-within:ring-offset-2">
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground"
      >
        <Icon name={meta.icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{meta.label}</span>
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {meta.description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={value}
        onChange={onChange}
        className="mt-1 h-5 w-5 shrink-0 rounded-sm border-border accent-[color:var(--brand-gold-ink)] focus:outline-none"
        aria-label={ariaLabel}
      />
    </label>
  );
}
