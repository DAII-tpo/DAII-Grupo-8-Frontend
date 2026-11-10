import type { EmergencyPriority, EmergencyTriageRequest } from '../../../types/emergency';

export type Answers = Partial<EmergencyTriageRequest>;

export const questions: { id: keyof EmergencyTriageRequest; text: string }[] = [
  { id: 'canMove', text: '¿Podés moverte?' },
  { id: 'bleeding', text: '¿Estás sangrando?' },
  { id: 'vehicleInvolved', text: '¿Hay un vehículo involucrado?' },
];

export function isComplete(answers: Answers): answers is EmergencyTriageRequest {
  return questions.every((question) => typeof answers[question.id] === 'boolean');
}

/** Prioridad que se muestra mientras se responde. Misma regla que el backend: ante la duda, el caso más grave. */
export function suggestPriority(answers: Answers): EmergencyPriority {
  if (answers.vehicleInvolved === true || answers.bleeding === true) return 'P1';
  if (!isComplete(answers)) return 'P1';
  return answers.canMove ? 'P3' : 'P2';
}
