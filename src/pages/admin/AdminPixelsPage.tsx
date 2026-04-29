import { useEffect, useState } from "react";
import { usePixelSettings, useUpdatePixelSettings, type PixelSettings } from "@/hooks/useSiteSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const META_EVENTS = [
  { key: "page_view", label: "page_view" },
  { key: "view_content", label: "view_content" },
  { key: "add_to_cart", label: "add_to_cart" },
  { key: "initiate_checkout", label: "initiate_checkout" },
  { key: "add_payment_info", label: "add_payment_info" },
  { key: "purchase", label: "purchase" },
  { key: "lead", label: "lead" },
  { key: "complete_registration", label: "complete_registration" },
];

const ADS_LABELS = [
  { key: "page_view", label: "page_view" },
  { key: "begin_checkout", label: "begin_checkout" },
  { key: "purchase", label: "purchase" },
  { key: "sign_up", label: "sign_up" },
];

const AdminPixelsPage = () => {
  const { data: s, isLoading } = usePixelSettings();
  const update = useUpdatePixelSettings();

  const [form, setForm] = useState<Partial<PixelSettings>>({});

  useEffect(() => {
    if (s) setForm(s);
  }, [s]);

  const set = <K extends keyof PixelSettings>(k: K, v: PixelSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const saveSection = async (values: Partial<PixelSettings>, label: string) => {
    if (!s) return;
    try {
      await update.mutateAsync({ id: s.id, values });
      toast({ title: `${label} salvo`, description: "Configurações atualizadas." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading || !s) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const metaEvents = (form.meta_events || s.meta_events) as Record<string, boolean>;
  const adsLabels = (form.google_ads_labels || s.google_ads_labels) as Record<string, string>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pixels & Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Configure os pixels de marketing usados no site.
        </p>
      </div>

      {/* Meta Pixel + CAPI */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Meta Pixel (Facebook)</CardTitle>
            <CardDescription>Pixel + Conversions API (CAPI)</CardDescription>
          </div>
          <Switch
            checked={!!form.meta_enabled}
            onCheckedChange={(v) => set("meta_enabled", v)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meta-id">Pixel ID</Label>
              <Input
                id="meta-id"
                placeholder="712616367446379"
                value={form.meta_pixel_id || ""}
                onChange={(e) => set("meta_pixel_id", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-token">Access Token (CAPI, opcional)</Label>
              <Input
                id="meta-token"
                type="password"
                placeholder="••••••••••••••••"
                value={form.meta_access_token || ""}
                onChange={(e) => set("meta_access_token", e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Eventos ativos</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {META_EVENTS.map((ev) => (
                <label key={ev.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!metaEvents[ev.key]}
                    onCheckedChange={(v) =>
                      set("meta_events", { ...metaEvents, [ev.key]: !!v })
                    }
                  />
                  <span className="text-foreground">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={() =>
              saveSection(
                {
                  meta_enabled: form.meta_enabled,
                  meta_pixel_id: form.meta_pixel_id,
                  meta_access_token: form.meta_access_token,
                  meta_events: metaEvents,
                },
                "Meta"
              )
            }
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Salvar Meta
          </Button>
        </CardContent>
      </Card>

      {/* Google Ads */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Google Ads</CardTitle>
            <CardDescription>Conversion ID (AW-XXXX) + labels por evento</CardDescription>
          </div>
          <Switch
            checked={!!form.google_ads_enabled}
            onCheckedChange={(v) => set("google_ads_enabled", v)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ads-id">Conversion ID</Label>
            <Input
              id="ads-id"
              placeholder="AW-123456789"
              value={form.google_ads_conversion_id || ""}
              onChange={(e) => set("google_ads_conversion_id", e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {ADS_LABELS.map((ev) => (
              <div key={ev.key} className="space-y-2">
                <Label>{ev.label} — label</Label>
                <Input
                  placeholder="abc123XYZ"
                  value={adsLabels[ev.key] || ""}
                  onChange={(e) =>
                    set("google_ads_labels", { ...adsLabels, [ev.key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
          <Button
            onClick={() =>
              saveSection(
                {
                  google_ads_enabled: form.google_ads_enabled,
                  google_ads_conversion_id: form.google_ads_conversion_id,
                  google_ads_labels: adsLabels,
                },
                "Google Ads"
              )
            }
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Salvar Google Ads
          </Button>
        </CardContent>
      </Card>

      {/* GTM */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Google Tag Manager (opcional)</CardTitle>
            <CardDescription>Container ID</CardDescription>
          </div>
          <Switch
            checked={!!form.gtm_enabled}
            onCheckedChange={(v) => set("gtm_enabled", v)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gtm-id">GTM Container ID</Label>
            <Input
              id="gtm-id"
              placeholder="GTM-XXXXXX"
              value={form.gtm_container_id || ""}
              onChange={(e) => set("gtm_container_id", e.target.value)}
            />
          </div>
          <Button
            onClick={() =>
              saveSection(
                {
                  gtm_enabled: form.gtm_enabled,
                  gtm_container_id: form.gtm_container_id,
                },
                "GTM"
              )
            }
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Salvar GTM
          </Button>
        </CardContent>
      </Card>

      {/* GA4 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Google Analytics 4</CardTitle>
            <CardDescription>Measurement ID (G-XXXXXXX)</CardDescription>
          </div>
          <Switch
            checked={!!form.ga4_enabled}
            onCheckedChange={(v) => set("ga4_enabled", v)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga4-id">Measurement ID</Label>
            <Input
              id="ga4-id"
              placeholder="G-XXXXXXX"
              value={form.ga4_measurement_id || ""}
              onChange={(e) => set("ga4_measurement_id", e.target.value)}
            />
          </div>
          <Button
            onClick={() =>
              saveSection(
                {
                  ga4_enabled: form.ga4_enabled,
                  ga4_measurement_id: form.ga4_measurement_id,
                },
                "GA4"
              )
            }
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Salvar GA4
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPixelsPage;
