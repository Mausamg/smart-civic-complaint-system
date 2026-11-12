import {
  getAdminComplaints,
  type ComplaintApiResponse,
} from './complaintService';

export interface StaffWorkload {
  totalAssigned: number;
  activeAssigned: number;
  inProgress: number;
  resolved: number;
}

const ACTIVE_STATUSES = new Set([
  'submitted',
  'underreview',
  'inprogress',
]);

function normalizeStatus(status: string): string {
  return status.replace(/[^a-z]/gi, '').toLowerCase();
}

function normalizeStaffId(id: string): string {
  return id.trim().toLowerCase();
}

function emptyWorkload(): StaffWorkload {
  return {
    totalAssigned: 0,
    activeAssigned: 0,
    inProgress: 0,
    resolved: 0,
  };
}

export function summarizeStaffWorkloads(
  complaints: ComplaintApiResponse[]
): Record<string, StaffWorkload> {
  const workloads: Record<string, StaffWorkload> = {};

  for (const complaint of complaints) {
    if (!complaint.assignedToUserId) continue;

    const staffId = normalizeStaffId(
      complaint.assignedToUserId
    );

    if (!staffId) continue;

    if (!Object.prototype.hasOwnProperty.call(workloads, staffId)) {
      workloads[staffId] = emptyWorkload();
    }

    const workload = workloads[staffId];
    const status = normalizeStatus(complaint.status);

    workload.totalAssigned += 1;

    if (ACTIVE_STATUSES.has(status)) {
      workload.activeAssigned += 1;
    }

    if (status === 'inprogress') {
      workload.inProgress += 1;
    }

    if (status === 'resolved') {
      workload.resolved += 1;
    }
  }

  return workloads;
}

/**
 * Read every page of admin-visible complaints and
 * calculate workload totals using real assignments.
 *
 * This is suitable for the current MVP. For large
 * deployments, replace it with a backend aggregation
 * endpoint to avoid fetching every complaint.
 */
export async function getStaffWorkloads(
  accessToken: string
): Promise<Record<string, StaffWorkload>> {
  const pageSize = 100;

  const first = await getAdminComplaints(accessToken, {
    page: 1,
    pageSize,
  });

  const allComplaints = [...first.items];

  for (let page = 2; page <= first.totalPages; page++) {
    const response = await getAdminComplaints(accessToken, {
      page,
      pageSize,
    });

    allComplaints.push(...response.items);
  }

  return summarizeStaffWorkloads(allComplaints);
}
