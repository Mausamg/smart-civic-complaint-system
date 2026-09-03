import type { Complaint, Notification, ComplaintStatus } from '@/types';
import { complaints as allComplaints, notifications as allNotifications } from '@/data/mockData';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async getComplaints(): Promise<Complaint[]> {
    await delay(300);
    return allComplaints;
  },
  async getComplaint(id: string): Promise<Complaint | undefined> {
    await delay(200);
    return allComplaints.find((c) => c.id === id || c.trackingId === id);
  },
  async getCitizenComplaints(citizenId: string): Promise<Complaint[]> {
    await delay(250);
    return allComplaints.filter((c) => c.citizen.id === citizenId);
  },
  async getNotifications(): Promise<Notification[]> {
    await delay(200);
    return allNotifications;
  },
  async submitComplaint(data: Partial<Complaint>): Promise<Complaint> {
    await delay(800);
    const trackingId = `KMC-2024-${String(Math.floor(100000 + Math.random() * 899999)).slice(0, 6)}`;
    return {
      id: `c-${Date.now()}`,
      trackingId,
      title: data.title || 'Untitled Complaint',
      description: data.description || '',
      category: data.category || 'other',
      subcategory: data.subcategory || 'General municipal issue',
      citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
      municipality: data.municipality || 'Kathmandu Metropolitan City',
      ward: data.ward || 'Ward 7',
      address: data.address || '',
      coordinates: data.coordinates || { lat: 27.7172, lng: 85.3249 },
      priority: data.priority || 'medium',
      status: 'submitted',
      assignedDepartment: data.assignedDepartment || 'General Administration',
      submittedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      lastUpdate: new Date().toISOString(),
      evidence: data.evidence || [],
      timeline: [
        {
          id: 't-new',
          status: 'submitted',
          label: 'Complaint Submitted',
          description: 'Reported via web portal.',
          timestamp: new Date().toISOString(),
          actor: 'Aarav Sharma',
          completed: true,
        },
      ],
      comments: [],
      isAnonymous: data.isAnonymous ?? false,
      isPublic: data.isPublic ?? true,
    };
  },
  async updateComplaintStatus(id: string, status: ComplaintStatus): Promise<{ success: boolean }> {
    await delay(400);
    void id;
    void status;
    return { success: true };
  },
};
