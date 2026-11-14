import { httpClient } from '../http/httpClient';

export type RestockTask = {
  id: number;
  activityId: string;
  activityTitle: string;
  stationId: number;
  stationName: string;
  distanceMeters: number;
  coverageMeters?: number;
  deadline: string;
  capacity: number;
  totalBikes: number;
  availableBikes: number;
  availableSlots: number;
  targetBikes: number;
  status: RestockStatus;
  resolution: 'STOCK_SUFFICIENT' | 'TARGET_REACHED' | 'MANUAL' | 'EXPIRED' | null;
  resolvedAt: string | null;
  activityChange?: {
    state: 'PROGRAMADA' | 'SUSPENDIDA' | 'CANCELADA';
    modifiedAt: string;
    reason: string | null;
  } | null;
};

export type RestockStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';
type TransferSource = {
  stationId: number;
  stationName: string;
  totalBikes: number;
  availableBikes: number;
  minimumBikes: number;
  transferableBikes: number;
};

export type EventTransferPlan = {
  activityId: string;
  plannedBikes: number;
  remainingBikes: number;
  strategy?: 'DISTANCE' | 'MODEL' | 'NO_CHOICE' | 'MODEL_UNAVAILABLE' | 'COVERAGE_PROTECTED';
  transfers: {
    source: TransferSource;
    destinationId: number;
    destinationName: string;
    bikes: number;
    distanceMeters: number;
    sharedDestination: boolean;
  }[];
};
const path = '/api/v1/admin/festival-restock-tasks';

export const restockService = {
  async getUpcoming(signal?: AbortSignal): Promise<RestockTask[]> {
    const { data } = await httpClient.get<RestockTask[]>(path, { signal });
    return data;
  },
  async updateTarget(id: number, targetBikes: number): Promise<RestockTask> {
    return (await httpClient.patch<RestockTask>(`${path}/${id}/target`, { targetBikes })).data;
  },
  async complete(id: number): Promise<RestockTask> {
    return (await httpClient.patch<RestockTask>(`${path}/${id}/complete`)).data;
  },
  async getTransferPlans(signal?: AbortSignal, useModel = false): Promise<EventTransferPlan[]> {
    return (await httpClient.get<EventTransferPlan[]>(`${path}/transfer-plan`, { signal, params: { useModel } })).data;
  },
};
