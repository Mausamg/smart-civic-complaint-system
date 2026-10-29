export type UserRole = 'citizen' | 'staff' | 'admin';

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'reopened'
  | 'closed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ComplaintCategory =
  | 'potholes'
  | 'garbage'
  | 'streetlights'
  | 'water'
  | 'drainage'
  | 'traffic_signals'
  | 'property_damage'
  | 'noise'
  | 'illegal_construction'
  | 'public_safety'
  | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  ward?: string;
  municipality?: string;
  address?: string;
  department?: string;
  position?: string;
}

export interface TimelineEvent {
  id: string;
  status: ComplaintStatus;
  label: string;
  description: string;
  timestamp: string;
  actor: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  author: string;
  authorRole: UserRole;
  avatar?: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface Evidence {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  caption?: string;
  uploadedAt: string;
}

export interface Complaint {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  subcategory: string;
  citizen: { name: string; id: string };
  municipality: string;
  ward: string;
  address: string;
  coordinates: { lat: number; lng: number };
  priority: Priority;
  status: ComplaintStatus;
  assignedDepartment: string;
  assignedStaff?: string;
  submittedAt: string;
  dueDate: string;
  lastUpdate: string;
  estimatedResolution?: string;
  evidence: Evidence[];
  timeline: TimelineEvent[];
  comments: Comment[];
  rating?: number;
  feedback?: string;
  isAnonymous: boolean;
  isPublic: boolean;
}

export interface Department {
  id: string;
  name: string;
  head: string;
  categories: ComplaintCategory[];
  staffCount: number;
  activeComplaints: number;
  avgResolutionDays: number;
  satisfaction: number;
  isActive: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  activeComplaints: number;
  resolvedComplaints: number;
  satisfaction: number;
  avatar?: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  type: 'complaint_update' | 'assignment' | 'comment' | 'resolution' | 'escalation' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: 'general' | 'emergency' | 'maintenance' | 'policy' | 'event';
  publishedAt: string;
  expiresAt?: string;
  ward?: string;
  featured: boolean;
  author: string;
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
