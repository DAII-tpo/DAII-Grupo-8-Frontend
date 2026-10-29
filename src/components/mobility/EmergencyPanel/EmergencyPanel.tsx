import { Alert, Badge, Button, Group, Loader, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { CircleAlert, CircleCheck, Clock3, MapPin, Phone, Siren } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { emergencyService } from '../../../services/emergencies/emergencyService';
import { getBrowserLocation } from '../../../services/location/browserLocation';
import type { EmergencyResponse } from '../../../types/emergency';
import type { TripResponse } from '../../../types/trip';

import classes from './EmergencyPanel.module.css';
import { type Answers, isComplete, questions, suggestPriority } from './triage';

const holdMilliseconds = 2_000;
const tickMilliseconds = 250;
const sendingPollMilliseconds = 3_000;

type Deadlines = { cancelAt: number; triageAt: number };
type Phase = 'confirm' | 'locating' | 'countdown' | 'triage' | 'sending' | 'reported';


type EmergencyPanelProps = {
  userId: number;
  trip: TripResponse;
  /** Emergencia en curso al recargar la página; null para un pedido nuevo. */
  initialEmergency: EmergencyResponse | null;
  onClose: () => void;
  onEmergencyChange: (emergency: EmergencyResponse) => void;
  onCancelled: () => void;
};

/**
 * Pedido de ayuda durante un viaje: SOS (mantener presionado), ventana para cancelar, cuestionario y aviso.
 * Los plazos los controla el backend; acá solo se muestran. Si se cierra la página, el aviso sale igual.
 */
export function EmergencyPanel({
  userId,
  trip,
  initialEmergency,
  onClose,
  onEmergencyChange,
  onCancelled,
}: Readonly<EmergencyPanelProps>) {
  const [emergency, setEmergency] = useState<EmergencyResponse | null>(initialEmergency);
  const [deadlines, setDeadlines] = useState<Deadlines | null>(() =>
    initialEmergency ? deadlinesFromServer(initialEmergency) : null);
  const [now, setNow] = useState(() => Date.now());
  const [isLocating, setIsLocating] = useState(false);
  const [triageClosed, setTriageClosed] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phase = derivePhase(emergency, deadlines, now, isLocating, triageClosed);

  const updateEmergency = useCallback((updated: EmergencyResponse) => {
    setEmergency(updated);
    onEmergencyChange(updated);
  }, [onEmergencyChange]);

  useEffect(() => {
    if (emergency?.status !== 'PENDING') return undefined;
    const timer = globalThis.setInterval(() => setNow(Date.now()), tickMilliseconds);
    return () => globalThis.clearInterval(timer);
  }, [emergency?.status]);

  // Vencido el cuestionario, el backend avisa solo; se consulta hasta ver la emergencia enviada.
  useEffect(() => {
    if (phase !== 'sending') return undefined;
    const timer = globalThis.setInterval(() => {
      emergencyService.getCurrent(userId)
        .then((current) => {
          if (current?.status === 'REPORTED') updateEmergency(current);
        })
        .catch(() => undefined);
    }, sendingPollMilliseconds);
    return () => globalThis.clearInterval(timer);
  }, [phase, updateEmergency, userId]);

  const requestHelp = async () => {
    setError(null);
    setIsLocating(true);
    try {
      const created = await emergencyService.report(userId, trip.id, await getBrowserLocation());
      const start = Date.now();
      setDeadlines({
        cancelAt: start + created.cancelWindowSeconds * 1_000,
        triageAt: start + (created.cancelWindowSeconds + created.triageWindowSeconds) * 1_000,
      });
      setNow(start);
      updateEmergency(created);
    } catch (requestError) {
      setError(requestHelpErrorMessage(requestError));
    } finally {
      setIsLocating(false);
    }
  };

  const cancel = async () => {
    if (!emergency) return;
    setIsBusy(true);
    setError(null);
    try {
      await emergencyService.cancel(userId, emergency.id);
      onCancelled();
    } catch (cancelError) {
      setError(statusOf(cancelError) === 409
        ? 'Ya pasó el tiempo para cancelar: contanos cómo estás para que te ayuden.'
        : 'No pudimos cancelar el pedido. Probá de nuevo.');
    } finally {
      setIsBusy(false);
    }
  };

  const submitTriage = async () => {
    if (!emergency || !isComplete(answers)) return;
    setIsBusy(true);
    setError(null);
    try {
      updateEmergency(await emergencyService.submitTriage(userId, emergency.id, answers));
    } catch (triageError) {
      if (statusOf(triageError) === 409) {
        // Venció el plazo o ya se envió: el backend avisa igual.
        setTriageClosed(true);
      } else {
        setError('No pudimos enviar tus respuestas. Probá de nuevo; si no llegan a tiempo, avisamos igual.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const errorAlert = error ? (
    <Alert className={classes.errorAlert} color="red" icon={<CircleAlert size={18} />} variant="light">
      {error}
    </Alert>
  ) : null;

  if (phase === 'confirm' || phase === 'locating') {
    return (
      <Paper aria-labelledby="sos-title" className={`${classes.panel} ${classes.danger}`} component="section" p="xl" radius="lg">
        <Stack align="center" gap="md">
          <Badge className={classes.badge}>Asistencia durante el viaje</Badge>
          <Title className={classes.title} id="sos-title" order={2}>Pedir ayuda</Title>
          <Text className={classes.text} ta="center">
            Viaje {trip.bikeCode} · desde {trip.originStationName}
          </Text>
          {phase === 'locating' ? (
            <Group className={classes.locating} gap="sm"><Loader color="white" size="sm" /><Text>Tomando tu ubicación...</Text></Group>
          ) : (
            <HoldToConfirmButton onConfirm={() => void requestHelp()} />
          )}
          <Text className={classes.text} fw={700} ta="center">Mantené presionado 2 s para pedir ayuda</Text>
          <Text className={classes.subtle} ta="center">
            Enviamos tu ubicación y los datos de tu viaje a la central de Emergencias.
          </Text>
          {errorAlert}
          <Group justify="center">
            <Button className={classes.secondaryButton} disabled={phase === 'locating'} onClick={onClose} variant="outline">
              Volver al viaje
            </Button>
            <CallEmergencyButton />
          </Group>
        </Stack>
      </Paper>
    );
  }

  if (!emergency) return null;

  if (phase === 'countdown' && deadlines) {
    const seconds = secondsLeft(deadlines.cancelAt, now);
    return (
      <Paper aria-labelledby="sos-title" className={`${classes.panel} ${classes.danger}`} component="section" p="xl" radius="lg">
        <Stack gap="md">
          <EmergencyHeading code={emergency.code} />
          <Group align="center" gap="lg" wrap="nowrap">
            <div aria-live="polite" className={classes.countdown}>
              <span className={classes.countdownValue}>{seconds}</span>
              <span className={classes.countdownLabel}>s para cancelar</span>
            </div>
            <div>
              <Title className={classes.title} id="sos-title" order={2}>Pediste ayuda</Title>
              <Text className={classes.text}>
                Si fue un error, cancelalo ahora. En {seconds} s avisamos a Emergencias con tu ubicación y tu viaje.
              </Text>
            </div>
          </Group>
          <EmergencyFacts emergency={emergency} />
          {errorAlert}
          <Group>
            <Button className={classes.primaryButton} loading={isBusy} onClick={() => void cancel()} variant="white">
              Fue un error, cancelar
            </Button>
            <CallEmergencyButton />
          </Group>
        </Stack>
      </Paper>
    );
  }

  if (phase === 'triage' && deadlines) {
    const priority = suggestPriority(answers);
    return (
      <Paper aria-labelledby="triage-title" className={`${classes.panel} ${classes.triage}`} component="section" p="xl" radius="lg">
        <Stack gap="md">
          <Group align="flex-start" justify="space-between" wrap="wrap">
            <Group gap="md" wrap="nowrap">
              <div className={classes.triageIcon}><Siren size={22} /></div>
              <div>
                <Text className={classes.eyebrow}>Emergencia en curso · {emergency.code}</Text>
                <Title className={classes.triageTitle} id="triage-title" order={2}>¿Cómo estás?</Title>
              </div>
            </Group>
            <Badge className={classes.priorityBadge}>Prioridad sugerida: {priority}</Badge>
          </Group>
          <Text c="dimmed">
            Tres respuestas ayudan al operador a mandar la ayuda correcta. Si no respondés
            en {secondsLeft(deadlines.triageAt, now)} s, se asume el caso más grave.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {questions.map((question) => (
              <fieldset className={classes.question} key={question.id}>
                <legend className={classes.questionText}>{question.text}</legend>
                <Group grow gap="sm">
                  <AnswerButton
                    label="Sí"
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: true }))}
                    selected={answers[question.id] === true}
                  />
                  <AnswerButton
                    label="No"
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: false }))}
                    selected={answers[question.id] === false}
                  />
                </Group>
              </fieldset>
            ))}
          </SimpleGrid>
          {errorAlert}
          <Group>
            <Button
              className={classes.submitButton}
              disabled={!isComplete(answers)}
              loading={isBusy}
              onClick={() => void submitTriage()}
            >
              Enviar respuestas
            </Button>
            <CallEmergencyButton tone="light" />
          </Group>
        </Stack>
      </Paper>
    );
  }

  if (phase === 'sending') {
    return (
      <Paper aria-labelledby="sos-title" className={`${classes.panel} ${classes.danger}`} component="section" p="xl" radius="lg">
        <Stack gap="md">
          <EmergencyHeading code={emergency.code} />
          <Group gap="sm"><Loader color="white" size="sm" /><Title className={classes.title} id="sos-title" order={2}>Avisando a Emergencias...</Title></Group>
          <Text className={classes.text}>Mandamos tu ubicación y tu viaje, asumiendo el caso más grave.</Text>
          <EmergencyFacts emergency={emergency} />
          <Group><CallEmergencyButton /></Group>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper aria-labelledby="sos-title" className={`${classes.panel} ${classes.danger}`} component="section" p="xl" radius="lg">
      <div className={classes.decoration} aria-hidden="true"><Siren size={116} strokeWidth={1.2} /></div>
      <Stack className={classes.content} gap="md">
        <EmergencyHeading code={emergency.code} />
        <Title className={classes.title} id="sos-title" order={2}>Alerta enviada a Emergencias</Title>
        <Text className={classes.text}>Quedate donde estás si podés. Emergencias ya tiene tu ubicación y los datos del viaje.</Text>
        <Group gap="lg" wrap="wrap">
          <Fact icon={CircleCheck} text="Ubicación y viaje compartidos" />
          {emergency.priority ? <Fact icon={CircleCheck} text={`Prioridad sugerida: ${emergency.priority}`} /> : null}
        </Group>
        <EmergencyFacts emergency={emergency} />
        <Group><CallEmergencyButton /></Group>
      </Stack>
    </Paper>
  );
}

function EmergencyHeading({ code }: Readonly<{ code: string }>) {
  return (
    <Group gap="xs" wrap="wrap">
      <Badge className={classes.badge}>Emergencia en curso</Badge>
      <Text className={classes.code}>{code}</Text>
    </Group>
  );
}

function EmergencyFacts({ emergency }: Readonly<{ emergency: EmergencyResponse }>) {
  return (
    <Group className={classes.facts} gap="lg" wrap="wrap">
      <Fact icon={MapPin} text={locationText(emergency.accuracyMeters)} />
      <Fact icon={Clock3} text={`Viaje pausado sin cobro · ${emergency.bikeCode} bloqueada`} />
    </Group>
  );
}

function Fact({ icon: Icon, text }: Readonly<{ icon: typeof MapPin; text: string }>) {
  return <Text className={classes.fact}><Icon size={17} /> {text}</Text>;
}

function AnswerButton({ label, onClick, selected }: Readonly<{ label: string; onClick: () => void; selected: boolean }>) {
  return (
    <button aria-pressed={selected} className={classes.answer} data-selected={selected} onClick={onClick} type="button">
      {label}
    </button>
  );
}

function CallEmergencyButton({ tone = 'dark' }: Readonly<{ tone?: 'dark' | 'light' }>) {
  return (
    <Button
      className={tone === 'dark' ? classes.secondaryButton : classes.callLight}
      leftSection={<Phone size={16} />}
      renderRoot={(props) => <a {...props} href="tel:911" />}
      variant="outline"
    >
      Llamar al 911
    </Button>
  );
}

/** Botón que confirma solo si se mantiene presionado: evita pedidos de ayuda por un toque accidental. */
function HoldToConfirmButton({ onConfirm }: Readonly<{ onConfirm: () => void }>) {
  const [isHolding, setIsHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const release = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setIsHolding(false);
  };

  const press = () => {
    if (timer.current !== null) return;
    setIsHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setIsHolding(false);
      onConfirm();
    }, holdMilliseconds);
  };

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  return (
    <button
      aria-label="SOS: mantené presionado 2 segundos para pedir ayuda"
      className={classes.sosButton}
      data-holding={isHolding}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) press();
      }}
      onKeyUp={release}
      onPointerDown={press}
      onPointerLeave={release}
      onPointerUp={release}
      onBlur={release}
      type="button"
    >
      <Siren size={30} />
      <span>SOS</span>
    </button>
  );
}

function derivePhase(
  emergency: EmergencyResponse | null,
  deadlines: Deadlines | null,
  now: number,
  isLocating: boolean,
  triageClosed: boolean,
): Phase {
  if (!emergency || !deadlines) return isLocating ? 'locating' : 'confirm';
  if (emergency.status === 'REPORTED') return 'reported';
  if (now < deadlines.cancelAt) return 'countdown';
  if (!triageClosed && now < deadlines.triageAt) return 'triage';
  return 'sending';
}

function deadlinesFromServer(emergency: EmergencyResponse): Deadlines {
  return { cancelAt: Date.parse(emergency.cancelableUntil), triageAt: Date.parse(emergency.triageDeadline) };
}

function secondsLeft(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}

function locationText(accuracyMeters: number | null) {
  if (accuracyMeters === null) return 'Ubicación compartida';
  return `Ubicación compartida (precisión ${Math.round(accuracyMeters)} m)`;
}

function requestHelpErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return 'No pudimos obtener tu ubicación. Activá la ubicación del navegador para pedir ayuda, o llamá al 911.';
  }
  if (error.response?.status === 409) {
    return 'Tu viaje ya no está activo o ya tiene un pedido de ayuda en curso.';
  }
  return 'No pudimos enviar el pedido de ayuda. Probá de nuevo o llamá al 911.';
}

function statusOf(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined;
}
