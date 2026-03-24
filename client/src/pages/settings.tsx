import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Settings, Key, Globe, Brain, Save, Eye, EyeOff, CheckCircle2, Link2, Copy, RefreshCw, Users, Lock, Unlock, Trash2 } from "lucide-react";

interface SettingEntry {
  key: string;
  value: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
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
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: number; email: string; displayName: string; createdAt: string }[]>([]);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  // Admin lock
  const [adminPassword, setAdminPassword] = useState("");
  const [apiUnlocked, setApiUnlocked] = useState(false);
  const [adminError, setAdminError] = useState("");

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: SettingEntry[] = await res.json();
        const map = new Map(data.map((s) => [s.key, s.value]));
        if (map.has("anthropic_api_key")) { setAnthropicApiKey(map.get("anthropic_api_key")!); setSavedKeys((prev) => new Set(prev).add("anthropic_api_key")); }
        if (map.has("dataforseo_login")) { setDataforseoLogin(map.get("dataforseo_login")!); setSavedKeys((prev) => new Set(prev).add("dataforseo_login")); }
        if (map.has("dataforseo_password")) { setDataforseoPassword(map.get("dataforseo_password")!); setSavedKeys((prev) => new Set(prev).add("dataforseo_password")); }
        if (map.has("default_country")) setDefaultCountry(map.get("default_country")!);
        if (map.has("default_language")) setDefaultLanguage(map.get("default_language")!);
        if (map.has("default_region")) setDefaultRegion(map.get("default_region")!);
        if (map.has("ai_model")) setAiModel(map.get("ai_model")!);
        if (map.has("invite_code")) setInviteCode(map.get("invite_code")!);
      }
    } catch (err) { console.error("Failed to load settings:", err); }
    finally { setLoading(false); }

    try {
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) setTeamMembers(await usersRes.json());
    } catch (err) { console.error("Failed to load team members:", err); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const entries: SettingEntry[] = [];
      if (anthropicApiKey && !anthropicApiKey.includes("...")) entries.push({ key: "anthropic_api_key", value: anthropicApiKey });
      if (dataforseoLogin && !dataforseoLogin.includes("...")) entries.push({ key: "dataforseo_login", value: dataforseoLogin });
      if (dataforseoPassword && !dataforseoPassword.includes("...")) entries.push({ key: "dataforseo_password", value: dataforseoPassword });
      entries.push({ key: "default_country", value: defaultCountry });
      entries.push({ key: "default_language", value: defaultLanguage });
      if (defaultRegion) entries.push({ key: "default_region", value: defaultRegion });
      entries.push({ key: "ai_model", value: aiModel });

      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entries) });
      if (res.ok) {
        toast({ title: "Instellingen opgeslagen", description: `${entries.length} instellingen bijgewerkt.` });
        loadSettings();
      } else { throw new Error("Failed to save"); }
    } catch (err) {
      toast({ title: "Fout bij opslaan", description: "Kon instellingen niet opslaan.", variant: "destructive" });
    } finally { setSaving(false); }
  }

  function tryUnlock() {
    const stored = localStorage.getItem("thijo_admin_pw");
    if (!stored) {
      if (adminPassword.length < 4) { setAdminError("Kies een wachtwoord van minimaal 4 tekens"); return; }
      localStorage.setItem("thijo_admin_pw", adminPassword);
      setApiUnlocked(true);
      setAdminError("");
    } else if (adminPassword === stored) {
      setApiUnlocked(true);
      setAdminError("");
    } else {
      setAdminError("Onjuist wachtwoord");
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

      {/* API Configuration — Password Protected */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {apiUnlocked ? <Unlock className="h-5 w-5 text-emerald-500" /> : <Lock className="h-5 w-5 text-orange-500" />}
            <CardTitle>API Configuratie</CardTitle>
          </div>
          <CardDescription>
            {apiUnlocked ? "API keys zijn ontgrendeld." : "Voer het beheerderswachtwoord in om API keys te bekijken en bewerken."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!apiUnlocked ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={localStorage.getItem("thijo_admin_pw") ? "Beheerderswachtwoord" : "Kies een nieuw wachtwoord"}
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setAdminError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
                  className="flex-1"
                />
                <Button variant="outline" onClick={tryUnlock} className="gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Ontgrendel
                </Button>
              </div>
              {adminError && <p className="text-sm text-destructive">{adminError}</p>}
              <p className="text-xs text-muted-foreground">
                {localStorage.getItem("thijo_admin_pw")
                  ? "Voer het wachtwoord in dat je eerder hebt ingesteld."
                  : "Eerste keer? Kies een wachtwoord om de API instellingen te beveiligen."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Claude AI */}
              <div className="space-y-4 p-4 rounded-lg border border-border/40 bg-muted/10">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold">Claude AI</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input id="anthropic-key" type={showAnthropicKey ? "text" : "password"} placeholder="sk-ant-..." value={anthropicApiKey} onChange={(e) => setAnthropicApiKey(e.target.value)} />
                      <button type="button" onClick={() => setShowAnthropicKey(!showAnthropicKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {savedKeys.has("anthropic_api_key") && <div className="flex items-center text-green-600"><CheckCircle2 className="h-5 w-5" /></div>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verkrijgbaar via <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-primary underline">console.anthropic.com</a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-model">AI Model</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (aanbevolen)</SelectItem>
                      <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (sneller, goedkoper)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* DataForSEO */}
              <div className="space-y-4 p-4 rounded-lg border border-border/40 bg-muted/10">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">DataForSEO</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dfs-login">Login (e-mail)</Label>
                  <div className="flex gap-2">
                    <Input id="dfs-login" type="email" placeholder="je@email.com" value={dataforseoLogin} onChange={(e) => setDataforseoLogin(e.target.value)} className="flex-1" />
                    {savedKeys.has("dataforseo_login") && <div className="flex items-center text-green-600"><CheckCircle2 className="h-5 w-5" /></div>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dfs-password">Wachtwoord</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input id="dfs-password" type={showDataForSeoPassword ? "text" : "password"} placeholder="••••••••" value={dataforseoPassword} onChange={(e) => setDataforseoPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowDataForSeoPassword(!showDataForSeoPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showDataForSeoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {savedKeys.has("dataforseo_password") && <div className="flex items-center text-green-600"><CheckCircle2 className="h-5 w-5" /></div>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registreer op <a href="https://dataforseo.com/" target="_blank" className="text-primary underline">dataforseo.com</a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Defaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <CardTitle>Standaard Regio-instellingen</CardTitle>
          </div>
          <CardDescription>Standaardwaarden voor nieuwe projecten. Kunnen per project worden overschreven.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Land</Label>
              <Select value={defaultCountry} onValueChange={setDefaultCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Input id="default-region" placeholder="bijv. Randstad, Noord-Brabant" value={defaultRegion} onChange={(e) => setDefaultRegion(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Team Invite */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-emerald-500" />
            <CardTitle>Team uitnodigen</CardTitle>
          </div>
          <CardDescription>Deel deze link met collega's zodat zij een account kunnen aanmaken.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteCode ? (
            <>
              <div className="space-y-2">
                <Label>Uitnodigingslink</Label>
                <div className="flex gap-2">
                  <Input readOnly value={`${window.location.origin}?invite=${inviteCode}`} className="flex-1 font-mono text-xs" />
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?invite=${inviteCode}`); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }}>
                    <Copy className="h-3.5 w-3.5" />
                    {inviteCopied ? "Gekopieerd!" : "Kopieer"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Uitnodigingscode</Label>
                <div className="flex gap-2">
                  <Input readOnly value={inviteCode} className="flex-1 font-mono" />
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={async () => {
                    const newCode = Math.random().toString(36).substring(2, 14);
                    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify([{ key: "invite_code", value: newCode }]) });
                    setInviteCode(newCode);
                    toast({ title: "Nieuwe code gegenereerd", description: "De oude link werkt niet meer." });
                  }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Vernieuw
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Vernieuw de code als je de toegang wilt intrekken voor nieuwe registraties.</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">De uitnodigingscode wordt automatisch aangemaakt bij de eerste registratie.</p>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      {teamMembers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle>Teamleden ({teamMembers.length})</CardTitle>
            </div>
            <CardDescription>Alle geregistreerde gebruikers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(member.displayName || member.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.displayName || "Onbekend"}
                      {currentUser && member.id === currentUser.id && (
                        <span className="text-xs text-muted-foreground ml-1.5">(jij)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.email || member.displayName}</p>
                  </div>
                  {member.createdAt && (
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(member.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                  {(!currentUser || member.id !== currentUser.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={async () => {
                        if (!confirm(`Weet je zeker dat je ${member.displayName || member.email} wilt verwijderen?`)) return;
                        try {
                          const res = await fetch(`/api/users/${member.id}`, { method: "DELETE" });
                          if (res.ok) {
                            setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
                            toast({ title: "Gebruiker verwijderd" });
                          } else {
                            const data = await res.json();
                            toast({ title: "Fout", description: data.message, variant: "destructive" });
                          }
                        } catch {
                          toast({ title: "Fout", description: "Kon gebruiker niet verwijderen", variant: "destructive" });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
