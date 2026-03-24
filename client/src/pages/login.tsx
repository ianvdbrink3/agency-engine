import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password, displayName || username);
      }
    } catch (err: any) {
      setError(err.message || "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <img
            src="/logo-clickwave.png"
            alt="Clickwave"
            width="240"
            height="54"
            className="mx-auto"
            style={{ objectFit: "contain", filter: "invert(1)" }}
          />
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-muted-foreground">THIJO</p>
        </div>

        <Card className="border border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "login" ? "Inloggen" : "Account aanmaken"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Log in met je account"
                : "Maak een nieuw account aan"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Naam</Label>
                  <Input
                    id="displayName"
                    placeholder="Je naam"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Gebruikersnaam</Label>
                <Input
                  id="username"
                  placeholder="gebruikersnaam"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === "login" ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {mode === "login" ? "Inloggen" : "Account aanmaken"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              {mode === "login" ? (
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Nog geen account? <span className="text-primary font-medium">Registreer</span>
                </button>
              ) : (
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Al een account? <span className="text-primary font-medium">Inloggen</span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
