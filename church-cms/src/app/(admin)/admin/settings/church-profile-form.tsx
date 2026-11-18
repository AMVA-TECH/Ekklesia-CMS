'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
} from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  useToast,
  useObjectUrl,
} from '@/app/_ekklesia/ui';
import { t, tk } from '@/app/_ekklesia/i18n/core';

interface ChurchProfile {
  id: string;
  name: string;
  shortName: string | null;
  displayName: string | null;
  slug: string;
  timezone: string;
  defaultLocale: string;
  logoMediaId?: string | null;
  logoUrl?: string | null;
}

interface ResolvedSettings {
  branding: {
    productName: string;
    logoMediaId: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
  };
  identity: {
    description: string | null;
    category: string | null;
    vision: string | null;
    mission: string | null;
    mandate: string | null;
    motto: string | null;
    secondaryMotto: string | null;
    coreValues: string | null;
    history: string | null;
  };
  contact: {
    primaryContactName: string | null;
    email: string | null;
    phone: string | null;
    alternatePhone: string | null;
    alternateEmail: string | null;
  };
  location: {
    country: string | null;
    region: string | null;
    city: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
  };
  presence: {
    website: string | null;
    facebook: string | null;
    instagram: string | null;
    youtube: string | null;
    twitter: string | null;
    telegram: string | null;
    tiktok: string | null;
  };
  terminology: {
    organisationalUnitSingular: string;
    organisationalUnitPlural: string;
    membershipLabel: string;
  };
  modules: Record<string, boolean>;
  workflows: { announcementDualControl: boolean };
}

const TIMEZONES = [
  'Africa/Dar_es_Salaam',
  'Africa/Nairobi',
  'Africa/Kampala',
  'Africa/Johannesburg',
  'UTC',
] as const;

const LOCALES = [
  { value: 'en', label: tk('English') },
  { value: 'sw', label: tk('Kiswahili') },
] as const;

const MODULE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'people', label: tk('People & households') },
  { id: 'membership', label: tk('Membership & join requests') },
  { id: 'organisation', label: tk('Organisational units') },
  { id: 'events', label: tk('Events') },
  { id: 'attendance', label: tk('Attendance') },
  { id: 'finance', label: tk('Finance') },
  { id: 'messaging', label: tk('Messaging') },
  { id: 'governance', label: tk('Governance') },
];

function empty(v: string | null | undefined): string {
  return v ?? '';
}

/**
 * Sectioned church profile editor (General, Identity, Branding, Contact,
 * Location, Online, Experience). Roles/Access remain on the parent settings page.
 */
export function ChurchProfileForm(): React.ReactElement {
  const { push } = useToast();
  const formId = useId();
  const [section, setSection] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam');
  const [defaultLocale, setDefaultLocale] = useState('en');
  const [logoMediaId, setLogoMediaId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const [productName, setProductName] = useState('Ekklesia');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [mandate, setMandate] = useState('');
  const [motto, setMotto] = useState('');
  const [secondaryMotto, setSecondaryMotto] = useState('');
  const [coreValues, setCoreValues] = useState('');
  const [history, setHistory] = useState('');

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [altEmail, setAltEmail] = useState('');

  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [postal, setPostal] = useState('');

  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [tiktok, setTiktok] = useState('');

  const [unitSingular, setUnitSingular] = useState('Ministry');
  const [unitPlural, setUnitPlural] = useState('Ministries');
  const [membershipLabel, setMembershipLabel] = useState('Membership');
  const [modules, setModules] = useState<Record<string, boolean>>({
    people: true,
    membership: true,
    organisation: true,
    events: true,
    attendance: true,
    finance: true,
    messaging: true,
    governance: true,
  });
  const [dualControl, setDualControl] = useState(true);

  const markDirty = (): void => setDirty(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [church, settingsPayload] = await Promise.all([
        apiFetch<ChurchProfile>('/api/v1/churches/current'),
        apiFetch<{ resolved?: ResolvedSettings }>(
          '/api/v1/churches/current/settings',
        ).catch(() => null),
      ]);
      setName(church.name);
      setShortName(church.shortName ?? '');
      setDisplayName(church.displayName ?? '');
      setSlug(church.slug);
      setTimezone(church.timezone);
      setDefaultLocale(church.defaultLocale);
      setLogoMediaId(church.logoMediaId ?? null);
      setLogoUrl(
        church.logoUrl ??
          (church.logoMediaId
            ? `/api/v1/media/${church.logoMediaId}/content`
            : null),
      );
      setLogoFile(null);
      const r = settingsPayload?.resolved;
      if (r) {
        setProductName(r.branding.productName);
        setPrimaryColor(empty(r.branding.primaryColor));
        setSecondaryColor(empty(r.branding.secondaryColor));
        setAccentColor(empty(r.branding.accentColor));
        setDescription(empty(r.identity.description));
        setCategory(empty(r.identity.category));
        setVision(empty(r.identity.vision));
        setMission(empty(r.identity.mission));
        setMandate(empty(r.identity.mandate));
        setMotto(empty(r.identity.motto));
        setSecondaryMotto(empty(r.identity.secondaryMotto));
        setCoreValues(empty(r.identity.coreValues));
        setHistory(empty(r.identity.history));
        setContactName(empty(r.contact.primaryContactName));
        setEmail(empty(r.contact.email));
        setPhone(empty(r.contact.phone));
        setAltPhone(empty(r.contact.alternatePhone));
        setAltEmail(empty(r.contact.alternateEmail));
        setCountry(empty(r.location.country));
        setRegion(empty(r.location.region));
        setCity(empty(r.location.city));
        setAddress1(empty(r.location.addressLine1));
        setAddress2(empty(r.location.addressLine2));
        setPostal(empty(r.location.postalCode));
        setWebsite(empty(r.presence.website));
        setFacebook(empty(r.presence.facebook));
        setInstagram(empty(r.presence.instagram));
        setYoutube(empty(r.presence.youtube));
        setTwitter(empty(r.presence.twitter));
        setTelegram(empty(r.presence.telegram));
        setTiktok(empty(r.presence.tiktok));
        setUnitSingular(r.terminology.organisationalUnitSingular);
        setUnitPlural(r.terminology.organisationalUnitPlural);
        setMembershipLabel(r.terminology.membershipLabel);
        setModules(r.modules);
        setDualControl(r.workflows.announcementDualControl);
      }
      setDirty(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('Unable to load church profile'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  const logoPreviewUrl = useObjectUrl(logoFile);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const uploadLogoIfNeeded = async (): Promise<string | null> => {
    if (!logoFile) return logoMediaId;
    setLogoBusy(true);
    try {
      const form = new FormData();
      form.append('file', logoFile);
      form.append('kind', 'church_logo');
      const uploaded = await apiFetch<{ id: string }>('/api/v1/media/uploads', {
        method: 'POST',
        body: form,
      });
      return uploaded.id;
    } finally {
      setLogoBusy(false);
    }
  };

  const handleSave = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const nextLogoId = await uploadLogoIfNeeded();
      await apiFetch('/api/v1/churches/current', {
        method: 'PATCH',
        json: {
          name: name.trim(),
          shortName: shortName.trim() || null,
          displayName: displayName.trim() || null,
          slug: slug.trim(),
          timezone,
          defaultLocale,
        },
      });
      await apiFetch('/api/v1/churches/current/settings', {
        method: 'PATCH',
        json: {
          settings: {
            branding: {
              productName: productName.trim() || t('Ekklesia'),
              logoMediaId: nextLogoId,
              primaryColor: primaryColor.trim() || null,
              secondaryColor: secondaryColor.trim() || null,
              accentColor: accentColor.trim() || null,
            },
            identity: {
              description: description.trim(),
              category: category.trim(),
              vision: vision.trim(),
              mission: mission.trim(),
              mandate: mandate.trim(),
              motto: motto.trim(),
              secondaryMotto: secondaryMotto.trim(),
              coreValues: coreValues.trim(),
              history: history.trim(),
            },
            contact: {
              primaryContactName: contactName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              alternatePhone: altPhone.trim(),
              alternateEmail: altEmail.trim(),
            },
            location: {
              country: country.trim(),
              region: region.trim(),
              city: city.trim(),
              addressLine1: address1.trim(),
              addressLine2: address2.trim(),
              postalCode: postal.trim(),
            },
            presence: {
              website: website.trim(),
              facebook: facebook.trim(),
              instagram: instagram.trim(),
              youtube: youtube.trim(),
              twitter: twitter.trim(),
              telegram: telegram.trim(),
              tiktok: tiktok.trim(),
            },
            terminology: {
              organisationalUnitSingular: unitSingular.trim(),
              organisationalUnitPlural: unitPlural.trim(),
              membershipLabel: membershipLabel.trim(),
            },
            modules,
            workflows: { announcementDualControl: dualControl },
          },
        },
      });
      window.dispatchEvent(new Event('ek-session-refresh'));
      setDirty(false);
      push({ tone: 'success', message: t('Church profile saved.') });
      await load();
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : t('Could not save church profile.'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Panel title={t('Church profile')}>
        <div className="flex flex-col gap-3 p-4">
          <Skeleton size="heading" />
          <Skeleton size="line" />
          <Skeleton size="line" />
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="settings"
        tone="gold"
        title={t('Could not load profile')}
        description={error}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            {t('Try again')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('Church profile')}
        lede={t('Editable identity, branding, contact, location, and experience settings for this church only.')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={saving || !dirty}
              onClick={() => void load()}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              form={formId}
              size="sm"
              loading={saving || logoBusy}
            >
              {saving ? t('Saving…') : t('Save profile')}
            </Button>
          </div>
        }
      />

      <form
        id={formId}
        onSubmit={(e) => {
          void handleSave(e);
        }}
        onChange={markDirty}
      >
        <Tabs
          value={section}
          onValueChange={(v) => setSection(v)}
        >
          <TabList>
            <Tab value="general">{t('General')}</Tab>
            <Tab value="identity">{t('Identity')}</Tab>
            <Tab value="branding">{t('Branding')}</Tab>
            <Tab value="contact">{t('Contact')}</Tab>
            <Tab value="location">{t('Location')}</Tab>
            <Tab value="online">{t('Online')}</Tab>
            <Tab value="experience">{t('Experience')}</Tab>
          </TabList>

          <TabPanel value="general">
            <Panel title={t('General information')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={t('Official name')} required>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      markDirty();
                    }}
                    maxLength={200}
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('Short name')} hint={t('e.g. CMN')}>
                    <Input
                      value={shortName}
                      onChange={(e) => {
                        setShortName(e.target.value);
                        markDirty();
                      }}
                      maxLength={40}
                    />
                  </Field>
                  <Field label={t('Display name')} hint={t('e.g. CrossLife')}>
                    <Input
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        markDirty();
                      }}
                      maxLength={120}
                    />
                  </Field>
                </div>
                <Field
                  label={t('URL slug')}
                  hint={t('Lowercase letters, numbers, hyphens. Changing slug does not create a new tenant.')}
                >
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      markDirty();
                    }}
                    maxLength={80}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('Timezone')}>
                    <Select
                      value={timezone}
                      onChange={(e) => {
                        setTimezone(e.target.value);
                        markDirty();
                      }}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('Default locale')}>
                    <Select
                      value={defaultLocale}
                      onChange={(e) => {
                        setDefaultLocale(e.target.value);
                        markDirty();
                      }}
                    >
                      {LOCALES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {t(l.label)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel value="identity">
            <Panel title={t('Vision, mission and identity')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={t('Category / denomination')}>
                  <Input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Description')}>
                  <Textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
                <Field label={t('Motto')}>
                  <Input
                    value={motto}
                    onChange={(e) => {
                      setMotto(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Secondary motto')}>
                  <Input
                    value={secondaryMotto}
                    onChange={(e) => {
                      setSecondaryMotto(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Vision')}>
                  <Textarea
                    value={vision}
                    onChange={(e) => {
                      setVision(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
                <Field label={t('Mission')}>
                  <Textarea
                    value={mission}
                    onChange={(e) => {
                      setMission(e.target.value);
                      markDirty();
                    }}
                    rows={4}
                  />
                </Field>
                <Field label={t('Mandate')}>
                  <Textarea
                    value={mandate}
                    onChange={(e) => {
                      setMandate(e.target.value);
                      markDirty();
                    }}
                    rows={2}
                  />
                </Field>
                <Field label={t('Core values')}>
                  <Textarea
                    value={coreValues}
                    onChange={(e) => {
                      setCoreValues(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
                <Field label={t('History / background')}>
                  <Textarea
                    value={history}
                    onChange={(e) => {
                      setHistory(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel value="branding">
            <Panel title={t('Branding')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={logoPreviewUrl ?? logoUrl ?? undefined}
                    name={displayName || name || 'Church'}
                    size="lg"
                  />
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setLogoFile(e.target.files?.[0] ?? null);
                        markDirty();
                      }}
                    />
                    {logoMediaId || logoFile ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoMediaId(null);
                          setLogoUrl(null);
                          markDirty();
                        }}
                      >
                        {t('Remove logo')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <Field
                  label={t('Product name')}
                  hint={t('Used in verification SMS and similar member-facing copy.')}
                >
                  <Input
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      markDirty();
                    }}
                    maxLength={80}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t('Primary colour')} hint="#RRGGBB">
                    <Input
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        markDirty();
                      }}
                      placeholder="#1B3A4B"
                    />
                  </Field>
                  <Field label={t('Secondary colour')}>
                    <Input
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        markDirty();
                      }}
                      placeholder="#C4A35A"
                    />
                  </Field>
                  <Field label={t('Accent colour')}>
                    <Input
                      value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                </div>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel value="contact">
            <Panel title={t('Contact information')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={t('Primary contact')}>
                  <Input
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Official email')}>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Telephone')}>
                  <Input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Alternative phone')}>
                  <Input
                    value={altPhone}
                    onChange={(e) => {
                      setAltPhone(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Alternative email')}>
                  <Input
                    type="email"
                    value={altEmail}
                    onChange={(e) => {
                      setAltEmail(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel value="location">
            <Panel title={t('Location')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('Country')}>
                    <Input
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                  <Field label={t('Region')}>
                    <Input
                      value={region}
                      onChange={(e) => {
                        setRegion(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                </div>
                <Field label={t('City / district')}>
                  <Input
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Address line 1')}>
                  <Input
                    value={address1}
                    onChange={(e) => {
                      setAddress1(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Address line 2')}>
                  <Input
                    value={address2}
                    onChange={(e) => {
                      setAddress2(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Postal code')}>
                  <Input
                    value={postal}
                    onChange={(e) => {
                      setPostal(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel value="online">
            <Panel title={t('Online presence')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={t('Website')}>
                  <Input
                    type="url"
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value);
                      markDirty();
                    }}
                    placeholder="https://"
                  />
                </Field>
                <Field label={t('Facebook')}>
                  <Input
                    value={facebook}
                    onChange={(e) => {
                      setFacebook(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Instagram')}>
                  <Input
                    value={instagram}
                    onChange={(e) => {
                      setInstagram(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('YouTube')}>
                  <Input
                    value={youtube}
                    onChange={(e) => {
                      setYoutube(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('X / Twitter')}>
                  <Input
                    value={twitter}
                    onChange={(e) => {
                      setTwitter(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('Telegram')}>
                  <Input
                    value={telegram}
                    onChange={(e) => {
                      setTelegram(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={t('TikTok')}>
                  <Input
                    value={tiktok}
                    onChange={(e) => {
                      setTiktok(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel value="experience">
            <Panel title={t('Experience')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">
                  {t('Labels and modules for this church only. Security and permission codes stay platform-controlled.')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('Unit singular')}>
                    <Input
                      value={unitSingular}
                      onChange={(e) => {
                        setUnitSingular(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                  <Field label={t('Unit plural')}>
                    <Input
                      value={unitPlural}
                      onChange={(e) => {
                        setUnitPlural(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                </div>
                <Field label={t('Membership label')}>
                  <Input
                    value={membershipLabel}
                    onChange={(e) => {
                      setMembershipLabel(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">
                    {t('Enabled modules')}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MODULE_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={modules[opt.id] !== false}
                          onChange={(e) => {
                            setModules((prev) => ({
                              ...prev,
                              [opt.id]: e.target.checked,
                            }));
                            markDirty();
                          }}
                        />
                        {t(opt.label)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border"
                    checked={dualControl}
                    onChange={(e) => {
                      setDualControl(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span>
                    {t('Prefer dual-control for church-wide announcements')}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t('Stored now; publish policy will honour this in a later phase.')}
                    </span>
                  </span>
                </label>
              </div>
            </Panel>
          </TabPanel>
        </Tabs>
      </form>
    </div>
  );
}
