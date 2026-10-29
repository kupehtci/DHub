import { Button, Card, FieldError, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(usuario, password);
      navigate("/", { replace: true });
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">DHub</h1>
          <p className="text-sm text-muted">Panel de coordinación técnica de proyectos y equipos</p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField isRequired name="usuario" value={usuario} onChange={setUsuario}>
            <Label>Usuario</Label>
            <Input placeholder="coordinador" />
          </TextField>
          <TextField isRequired isInvalid={!!error} name="password" type="password" value={password} onChange={setPassword}>
            <Label>Contraseña</Label>
            <Input placeholder="••••••••" />
            {error ? <FieldError>{error}</FieldError> : null}
          </TextField>
          <Button fullWidth isPending={isLoading} type="submit">
            Entrar
          </Button>
        </form>
        <p className="text-xs text-muted">
          Acceso simple para el coordinador técnico. Más adelante se integrará con Microsoft Entra ID.
        </p>
      </Card>
    </div>
  );
}
