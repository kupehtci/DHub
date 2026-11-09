import { Button, Card, Description, Input, Label, TextField, useTheme } from "@heroui/react";
import axios from "axios";
import { useEffect, useState } from "react";
import { authApi, jiraApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatFechaHora } from "../lib/format";

type Mensaje = { tipo: "ok" | "error"; texto: string };

function extraerError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.mensaje) {
    return err.response.data.mensaje as string;
  }
  return fallback;
}

function Aviso({ mensaje }: { mensaje: Mensaje | null }) {
  if (!mensaje) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${mensaje.tipo === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
      {mensaje.texto}
    </p>
  );
}

export default function SettingsPage() {
  const { updateUser } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme("system");

  const [perfil, setPerfil] = useState({ nombreUsuario: "", nombreCompleto: "", email: "" });
  const [perfilMsg, setPerfilMsg] = useState<Mensaje | null>(null);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passwordMsg, setPasswordMsg] = useState<Mensaje | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [jiraForm, setJiraForm] = useState({ baseUrl: "", email: "", apiToken: "" });
  const [jiraTokenEnmascarado, setJiraTokenEnmascarado] = useState<string | null>(null);
  const [jiraFecha, setJiraFecha] = useState<string | null>(null);
  const [jiraMsg, setJiraMsg] = useState<Mensaje | null>(null);
  const [savingJira, setSavingJira] = useState(false);
  const [testingJira, setTestingJira] = useState(false);
  const [loadingJira, setLoadingJira] = useState(true);

  const cargarJira = () => {
    jiraApi
      .configuracion()
      .then((r) => {
        setJiraForm({ baseUrl: r.data.baseUrl ?? "", email: r.data.email ?? "", apiToken: "" });
        setJiraTokenEnmascarado(r.data.tokenEnmascarado);
        setJiraFecha(r.data.fechaActualizacion);
      })
      .finally(() => setLoadingJira(false));
  };

  useEffect(() => {
    authApi
      .me()
      .then((r) => setPerfil({ nombreUsuario: r.data.nombreUsuario, nombreCompleto: r.data.nombreCompleto, email: r.data.email ?? "" }))
      .finally(() => setLoadingPerfil(false));
    cargarJira();
  }, []);

  const handleGuardarPerfil = async () => {
    setPerfilMsg(null);
    setSavingPerfil(true);
    try {
      const { data } = await authApi.actualizarPerfil({
        nombreUsuario: perfil.nombreUsuario,
        nombreCompleto: perfil.nombreCompleto,
        email: perfil.email || null,
      });
      updateUser({ usuario: data.nombreUsuario, nombre: data.nombreCompleto });
      setPerfilMsg({ tipo: "ok", texto: "Datos actualizados correctamente." });
    } catch (err) {
      setPerfilMsg({ tipo: "error", texto: extraerError(err, "No se han podido actualizar los datos.") });
    } finally {
      setSavingPerfil(false);
    }
  };

  const handleCambiarPassword = async () => {
    setPasswordMsg(null);
    if (passwordForm.nueva.length < 6) {
      setPasswordMsg({ tipo: "error", texto: "La nueva contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (passwordForm.nueva !== passwordForm.confirmar) {
      setPasswordMsg({ tipo: "error", texto: "Las contraseñas nuevas no coinciden." });
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.cambiarPassword({ passwordActual: passwordForm.actual, passwordNueva: passwordForm.nueva });
      setPasswordForm({ actual: "", nueva: "", confirmar: "" });
      setPasswordMsg({ tipo: "ok", texto: "Contraseña actualizada correctamente." });
    } catch (err) {
      setPasswordMsg({ tipo: "error", texto: extraerError(err, "No se ha podido cambiar la contraseña.") });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleGuardarJira = async () => {
    setJiraMsg(null);
    if (!jiraForm.baseUrl || !jiraForm.email) {
      setJiraMsg({ tipo: "error", texto: "Indica la URL de Jira y el email." });
      return;
    }
    setSavingJira(true);
    try {
      const { data } = await jiraApi.actualizarConfiguracion({
        baseUrl: jiraForm.baseUrl,
        email: jiraForm.email,
        apiToken: jiraForm.apiToken || null,
      });
      setJiraForm((f) => ({ ...f, apiToken: "" }));
      setJiraTokenEnmascarado(data.tokenEnmascarado);
      setJiraFecha(data.fechaActualizacion);
      setJiraMsg({ tipo: "ok", texto: "Conexión con Jira guardada correctamente." });
    } catch (err) {
      setJiraMsg({ tipo: "error", texto: extraerError(err, "No se ha podido guardar la conexión con Jira.") });
    } finally {
      setSavingJira(false);
    }
  };

  const handleProbarJira = async () => {
    setJiraMsg(null);
    if (!jiraForm.baseUrl || !jiraForm.email || !jiraForm.apiToken) {
      setJiraMsg({ tipo: "error", texto: "Escribe la URL, el email y el API token para probar la conexión." });
      return;
    }
    setTestingJira(true);
    try {
      const { data } = await jiraApi.probarConexion({ baseUrl: jiraForm.baseUrl, email: jiraForm.email, apiToken: jiraForm.apiToken });
      setJiraMsg({ tipo: data.ok ? "ok" : "error", texto: data.mensaje });
    } catch (err) {
      setJiraMsg({ tipo: "error", texto: extraerError(err, "No se ha podido probar la conexión.") });
    } finally {
      setTestingJira(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted">Preferencias de la aplicación y datos de tu cuenta.</p>
      </div>

      <Card className="max-w-lg gap-4">
        <Card.Header>
          <Card.Title>Apariencia</Card.Title>
          <Card.Description>Tema claro, oscuro o según el sistema operativo.</Card.Description>
        </Card.Header>
        <Card.Content className="flex gap-2">
          <Button variant={theme === "light" ? "primary" : "secondary"} onPress={() => setTheme("light")}>
            Claro
          </Button>
          <Button variant={theme === "dark" ? "primary" : "secondary"} onPress={() => setTheme("dark")}>
            Oscuro
          </Button>
          <Button variant={theme === "system" ? "primary" : "secondary"} onPress={() => setTheme("system")}>
            Sistema
          </Button>
        </Card.Content>
        <p className="px-1 text-xs text-muted">Tema aplicado actualmente: {resolvedTheme}</p>
      </Card>

      <Card className="max-w-lg gap-4">
        <Card.Header>
          <Card.Title>Mi cuenta</Card.Title>
          <Card.Description>Datos del coordinador técnico que usa la aplicación.</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Aviso mensaje={perfilMsg} />
          <TextField isDisabled={loadingPerfil} value={perfil.nombreCompleto} onChange={(v) => setPerfil((f) => ({ ...f, nombreCompleto: v }))}>
            <Label>Nombre completo</Label>
            <Input placeholder="Nombre y apellidos" />
          </TextField>
          <TextField isDisabled={loadingPerfil} value={perfil.nombreUsuario} onChange={(v) => setPerfil((f) => ({ ...f, nombreUsuario: v }))}>
            <Label>Usuario</Label>
            <Input placeholder="usuario para iniciar sesión" />
          </TextField>
          <TextField isDisabled={loadingPerfil} type="email" value={perfil.email} onChange={(v) => setPerfil((f) => ({ ...f, email: v }))}>
            <Label>Email</Label>
            <Input placeholder="opcional" />
          </TextField>
          <div className="flex justify-end">
            <Button isDisabled={loadingPerfil} isPending={savingPerfil} onPress={handleGuardarPerfil}>
              Guardar cambios
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card className="max-w-lg gap-4">
        <Card.Header>
          <Card.Title>Cambiar contraseña</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Aviso mensaje={passwordMsg} />
          <TextField type="password" value={passwordForm.actual} onChange={(v) => setPasswordForm((f) => ({ ...f, actual: v }))}>
            <Label>Contraseña actual</Label>
            <Input />
          </TextField>
          <TextField type="password" value={passwordForm.nueva} onChange={(v) => setPasswordForm((f) => ({ ...f, nueva: v }))}>
            <Label>Nueva contraseña</Label>
            <Input />
            <Description>Mínimo 6 caracteres.</Description>
          </TextField>
          <TextField type="password" value={passwordForm.confirmar} onChange={(v) => setPasswordForm((f) => ({ ...f, confirmar: v }))}>
            <Label>Confirmar nueva contraseña</Label>
            <Input />
          </TextField>
          <div className="flex justify-end">
            <Button isDisabled={!passwordForm.actual || !passwordForm.nueva} isPending={savingPassword} onPress={handleCambiarPassword}>
              Cambiar contraseña
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card className="max-w-lg gap-4">
        <Card.Header>
          <Card.Title>Integración con Jira</Card.Title>
          <Card.Description>
            Conexión con Jira Cloud para traer el estado real de los tickets enlazados. Usa un usuario de
            servicio y su API token (Jira → Configuración de cuenta → Seguridad → Crear y gestionar tokens API).
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Aviso mensaje={jiraMsg} />
          <TextField isDisabled={loadingJira} value={jiraForm.baseUrl} onChange={(v) => setJiraForm((f) => ({ ...f, baseUrl: v }))}>
            <Label>URL de Jira Cloud</Label>
            <Input placeholder="https://tuempresa.atlassian.net" />
          </TextField>
          <TextField isDisabled={loadingJira} type="email" value={jiraForm.email} onChange={(v) => setJiraForm((f) => ({ ...f, email: v }))}>
            <Label>Email del usuario de servicio</Label>
            <Input placeholder="integraciones@tuempresa.com" />
          </TextField>
          <TextField isDisabled={loadingJira} type="password" value={jiraForm.apiToken} onChange={(v) => setJiraForm((f) => ({ ...f, apiToken: v }))}>
            <Label>API token</Label>
            <Input placeholder={jiraTokenEnmascarado ? jiraTokenEnmascarado : "Pega aquí tu API token"} />
            <Description>
              {jiraTokenEnmascarado
                ? "Ya hay un token guardado. Déjalo en blanco para conservarlo, o escribe uno nuevo para sustituirlo."
                : "Se guarda solo en tu base de datos, nunca se envía a ningún sitio salvo a Jira."}
            </Description>
          </TextField>
          {jiraFecha ? <p className="text-xs text-muted">Última actualización: {formatFechaHora(jiraFecha)}</p> : null}
          <div className="flex justify-end gap-2">
            <Button isDisabled={loadingJira} isPending={testingJira} variant="secondary" onPress={handleProbarJira}>
              Probar conexión
            </Button>
            <Button isDisabled={loadingJira} isPending={savingJira} onPress={handleGuardarJira}>
              Guardar
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
