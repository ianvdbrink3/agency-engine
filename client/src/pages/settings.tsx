import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Key, Globe, Brain, Save, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

interface SettingEntry {
  key: string;
  value: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showDataForSeoPassword, setShowDataForSeoPassword] = useState(false);

  // Form state
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [dataforseoLogin, setDataforseoLogin] = useState("");
  const [dataforseoPassword, setDataforseoPassword] = useState("");
  const [defaultCountry, setDefaultCountry] = useState("Nederland");
  const [defaultLanguage, setDefaultLanguage] = useState("Nederlands");
  const [defaultRegion, setDefaultRegion] = useState("");
  const [aiModel, setAiModel] = useState("claude-sonnet-4-20250514");

  // Track which fields have been saved
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: SettingEntry[] = await res.json();
        const map = new Map(data.map((s) => [s.key, s.value]));
        if (map.has("anthropic_api_key")) {
          setAnthropicApiKey(map.get("anthropic_api_key")!);
          setSavedKeys((prev) => new Set(prev).add("anthropic_api_key"));
        }
        if (map.has("dataforseo_login")) {
          setDataforseoLogin(map.get("dataforseo_login")!);
          setSavedKeys((prev) => new Set(prev).add("dataforseo_login"));
        }
        if (map.has("dataforseo_password")) {
          setDataforseoPassword(map.get("dataforseo_password")!);
          setSavedKeys((prev) => new Set(prev).add("dataforseo_password"));
        }
        if (map.has("default_country")) setDefaultCountry(map.get("default_country")!);
        if (map.has("default_language")) setDefaultLanguage(map.get("default_language")!);
        if (map.has("default_region")) setDefaultRegion(map.get("default_region")!);
        if (map.has("ai_model")) setAiModel(map.get("ai_model")!);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const entries: SettingEntry[] = [];

      if (anthropicApiKey && !anthropicApiKey.includes("...")) {
        entries.push({ key: "anthropic_api_key", value: anthropicApiKey });
      }
      if (dataforseoLogin && !dataforseoLogin.includes("...")) {
        entries.push({ key: "dataforseo_login", value: dataforseoLogin });
      }
      if (dataforseoPassword && !dataforseoPassword.includes("...")) {
        entries.push({ key: "dataforseo_password", value: dataforseoPassword });
      }
      entries.push({ key: "default_country", value: defaultCountry });
      entries.push({ key: "default_language", value: defaultLanguage });
      if (defaultRegion) entries.push({ key: "default_region", value: defaultRegion });
      entries.push({ key: "ai_model", value: aiModel });

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });

      if (res.ok) {
        toast({
          title: "Instellingen opgeslagen",
          description: `${entries.length} instellingen succesvol bijgewerkt.`,
        });
        // Reload to get masked values
        loadSettings();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      toast({
        title: "Fout bij opslaan",
        description: "Kon instellingen niet opslaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Instellingen</h1>
          <p className="text-muted-foreground">Beheer API keys, regio-instellingen en AI-configuratie</p>
        </div>
      </div>

      {/* Claude AI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" />
            <CardTitle>Claude AI Configuratie</CardTitle>
          </div>
          <CardDescription>
            Claude is de centrale intelligentielaag van THIJO Marketing Tool. Een API key is vereist voor AI-analyses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anthropic-key">Anthropic API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="anthropic-key"
                  type={showAnthropicKey ? "text" : "password"}
                  placeholder="sk-ant-..."
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {savedKeys.has("anthropic_api_key") && (
                <div className="flex items-center text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Verkrijgbaar via{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-primary underline">
                console.anthropic.com
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">AI Model</Label>
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (aanbevolen)</SelectItem>
                <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (sneller, goedkoper)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* DataForSEO Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-500" />
            <CardTitle>DataForSEO API</CardTitle>
          </div>
          <CardDescription>
            Wordt gebruikt voor zoekwoordanalyse. Zonder credentials worden demo-gegevens gebruikt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dfs-login">DataForSEO Login (e-mail)</Label>
            <div className="flex gap-2">
              <Input
                id="dfs-login"
                type="email"
                placeholder="je@email.com"
                value={dataforseoLogin}
                onChange={(e) => setDataforseoLogin(e.target.value)}
                className="flex-1"
              />
              {savedKeys.has("dataforseo_login") && (
                <div className="flex items-center text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dfs-password">DataForSEO Wachtwoord</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="dfs-password"
                  type={showDataForSeoPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={dataforseoPassword}
                  onChange={(e) => setDataforseoPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowDataForSeoPassword(!showDataForSeoPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showDataForSeoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {savedKeys.has("dataforseo_password") && (
                <div className="flex items-center text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Registreer op{" "}
              <a href="https://dataforseo.com/" target="_blank" className="text-primary underline">
                dataforseo.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regional Defaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <CardTitle>Standaard Regio-instellingen</CardTitle>
          </div>
          <CardDescription>
            Standaardwaarden voor nieuwe projecten. Kunnen per project worden overschreven.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Land</Label>
              <Select value={defaultCountry} onValueChange={setDefaultCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nederland">Nederland</SelectItem>
                  <SelectItem value="België">België</SelectItem>
                  <SelectItem value="Duitsland">Duitsland</SelectItem>
                  <SelectItem value="Verenigd Koninkrijk">Verenigd Koninkrijk</SelectItem>
                  <SelectItem value="Verenigde Staten">Verenigde Staten</SelectItem>
                  <SelectItem value="Frankrijk">Frankrijk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Taal</Label>
              <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nederlands">Nederlands</SelectItem>
                  <SelectItem value="Engels">Engels</SelectItem>
                  <SelectItem value="Duits">Duits</SelectItem>
                  <SelectItem value="Frans">Frans</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-region">Standaard regio (optioneel)</Label>
            <Input
              id="default-region"
              placeholder="bijv. Randstad, Noord-Brabant, heel Nederland"
              value={defaultRegion}
              onChange={(e) => setDefaultRegion(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Opslaan..." : "Instellingen opslaan"}
        </Button>
      </div>
    </div>
  );
}
