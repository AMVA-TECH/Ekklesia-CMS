'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
} from 'react';
import { useTranslations } from 'next-intl';
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

const LOCALE_VALUES = ['en', 'sw'] as const;

const MODULE_IDS = [
  'people',
  'membership',
  'organisation',
  'events',
  'attendance',
  'finance',
  'messaging',
  'governance',
] as const;

const MODULE_LABEL_KEYS = {
  people: 'modulePeople',
  membership: 'moduleMembership',
  organisation: 'moduleOrganisation',
  events: 'moduleEvents',
  attendance: 'moduleAttendance',
  finance: 'moduleFinance',
  messaging: 'moduleMessaging',
  governance: 'moduleGovernance',
} as const;

function empty(v: string | null | undefined): string {
  return v ?? '';
}

/**
 * Sectioned church profile editor (General, Identity, Branding, Contact,
 * Location, Online, Experience). Roles/Access remain on the parent settings page.
 */
export function ChurchProfileForm(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tc = useTranslations('Common');
  const ts = useTranslations('AdminSettings');
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
            : ts('unableLoadProfile'),
      );
    } finally {
      setLoading(false);
    }
  }, [ts]);

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
              productName: productName.trim() || 'Ekklesia',
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
      push({ tone: 'success', message: ts('profileSaved') });
      await load();
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : ts('couldNotSaveProfile'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Panel title={ts('churchProfile')}>
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
        title={ts('couldNotLoadProfile')}
        description={error}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            {tc('retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('churchProfile')}
        lede={t('churchProfileLede')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={saving || !dirty}
              onClick={() => void load()}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="submit"
              form={formId}
              size="sm"
              loading={saving || logoBusy}
            >
              {saving ? ts('saving') : ts('saveProfile')}
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
            <Tab value="general">{ts('tabGeneral')}</Tab>
            <Tab value="identity">{ts('tabIdentity')}</Tab>
            <Tab value="branding">{ts('tabBranding')}</Tab>
            <Tab value="contact">{ts('tabContact')}</Tab>
            <Tab value="location">{ts('tabLocation')}</Tab>
            <Tab value="online">{ts('tabOnline')}</Tab>
            <Tab value="experience">{ts('tabExperience')}</Tab>
          </TabList>

          <TabPanel value="general">
            <Panel title={ts('generalInfo')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={ts('officialName')} required>
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
                  <Field label={ts('shortName')} hint={ts('shortNameHint')}>
                    <Input
                      value={shortName}
                      onChange={(e) => {
                        setShortName(e.target.value);
                        markDirty();
                      }}
                      maxLength={40}
                    />
                  </Field>
                  <Field label={ts('displayName')} hint={ts('displayNameHint')}>
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
                  label={ts('urlSlug')}
                  hint={ts('urlSlugHint')}
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
                  <Field label={ts('timezone')}>
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
                  <Field label={ts('defaultLocale')}>
                    <Select
                      value={defaultLocale}
                      onChange={(e) => {
                        setDefaultLocale(e.target.value);
                        markDirty();
                      }}
                    >
                      {LOCALE_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {value === 'en'
                            ? ts('localeEnglish')
                            : ts('localeSwahili')}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel value="identity">
            <Panel title={ts('identityPanel')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={ts('category')}>
                  <Input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('description')}>
                  <Textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
                <Field label={ts('motto')}>
                  <Input
                    value={motto}
                    onChange={(e) => {
                      setMotto(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('secondaryMotto')}>
                  <Input
                    value={secondaryMotto}
                    onChange={(e) => {
                      setSecondaryMotto(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('vision')}>
                  <Textarea
                    value={vision}
                    onChange={(e) => {
                      setVision(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
                <Field label={ts('mission')}>
                  <Textarea
                    value={mission}
                    onChange={(e) => {
                      setMission(e.target.value);
                      markDirty();
                    }}
                    rows={4}
                  />
                </Field>
                <Field label={ts('mandate')}>
                  <Textarea
                    value={mandate}
                    onChange={(e) => {
                      setMandate(e.target.value);
                      markDirty();
                    }}
                    rows={2}
                  />
                </Field>
                <Field label={ts('coreValues')}>
                  <Textarea
                    value={coreValues}
                    onChange={(e) => {
                      setCoreValues(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
                <Field label={ts('history')}>
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
            <Panel title={ts('branding')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={logoPreviewUrl ?? logoUrl ?? undefined}
                    name={displayName || name || ts('churchFallback')}
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
                        {ts('removeLogo')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <Field
                  label={ts('productName')}
                  hint={ts('productNameHint')}
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
                  <Field label={ts('primaryColour')} hint={ts('colourHint')}>
                    <Input
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        markDirty();
                      }}
                      placeholder="#1B3A4B"
                    />
                  </Field>
                  <Field label={ts('secondaryColour')}>
                    <Input
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        markDirty();
                      }}
                      placeholder="#C4A35A"
                    />
                  </Field>
                  <Field label={ts('accentColour')}>
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
            <Panel title={ts('contactInformation')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={ts('primaryContact')}>
                  <Input
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('officialEmail')}>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('telephone')}>
                  <Input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('alternatePhone')}>
                  <Input
                    value={altPhone}
                    onChange={(e) => {
                      setAltPhone(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('alternateEmail')}>
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
            <Panel title={ts('location')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={ts('country')}>
                    <Input
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                  <Field label={ts('region')}>
                    <Input
                      value={region}
                      onChange={(e) => {
                        setRegion(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                </div>
                <Field label={ts('cityDistrict')}>
                  <Input
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('address1')}>
                  <Input
                    value={address1}
                    onChange={(e) => {
                      setAddress1(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('address2')}>
                  <Input
                    value={address2}
                    onChange={(e) => {
                      setAddress2(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('postalCode')}>
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
            <Panel title={ts('online')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <Field label={ts('website')}>
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
                <Field label={ts('facebook')}>
                  <Input
                    value={facebook}
                    onChange={(e) => {
                      setFacebook(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('instagram')}>
                  <Input
                    value={instagram}
                    onChange={(e) => {
                      setInstagram(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('youtube')}>
                  <Input
                    value={youtube}
                    onChange={(e) => {
                      setYoutube(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('twitter')}>
                  <Input
                    value={twitter}
                    onChange={(e) => {
                      setTwitter(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('telegram')}>
                  <Input
                    value={telegram}
                    onChange={(e) => {
                      setTelegram(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
                <Field label={ts('tiktok')}>
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
            <Panel title={ts('experience')}>
              <div className="grid max-w-2xl gap-4 p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">
                  {ts('experienceHint')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={ts('unitSingular')}>
                    <Input
                      value={unitSingular}
                      onChange={(e) => {
                        setUnitSingular(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                  <Field label={ts('unitPlural')}>
                    <Input
                      value={unitPlural}
                      onChange={(e) => {
                        setUnitPlural(e.target.value);
                        markDirty();
                      }}
                    />
                  </Field>
                </div>
                <Field label={ts('membershipLabel')}>
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
                    {ts('modules')}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MODULE_IDS.map((id) => (
                      <label
                        key={id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={modules[id] !== false}
                          onChange={(e) => {
                            setModules((prev) => ({
                              ...prev,
                              [id]: e.target.checked,
                            }));
                            markDirty();
                          }}
                        />
                        {ts(MODULE_LABEL_KEYS[id])}
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
                    {ts('dualControl')}
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
