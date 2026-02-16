import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  GraduationCapIcon, 
  SearchIcon, 
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  Loader2Icon,
  Filter,
  RefreshCw,
  AlertCircle,
  Mail,
  Clock,
  Award,
  MapPin
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { StudentLocationMap } from './StudentLocationMap';

interface Student {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  status: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  studentIdDocument?: string;
  studentIdUploadedAt?: string;
  phone?: string;
  collegeEmail?: string;
  collegeName?: string;
  enrollmentNumber?: string;
  branch?: string;
  yearOfStudy?: string;
  verificationStatus?: string;
  isVerified?: boolean;
}

export function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [wsConnected, setWsConnected] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [loadingLocations, setLoadingLocations] = useState(false);
  const { toast } = useToast();

  // Set up real-time updates
  useRealtimeUpdates(
    (update) => {
      // Handle student status update
      setStudents(prev => 
        prev.map(s => s._id === update.studentId ? { ...s, ...update.student } : s)
      );
      setLastUpdate(new Date());
      toast({
        title: '🔄 Live Update',
        description: `${update.student.firstName} ${update.student.lastName} status changed to ${update.approvalStatus}`,
      });
    },
    undefined,
    (deletion) => {
      // Handle user deletion
      setStudents(prev => prev.filter(s => s._id !== deletion.userId));
      setLastUpdate(new Date());
      toast({
        title: '🗑️ Student Deleted',
        description: 'A student has been removed from the system',
      });
    },
    (connected) => {
      setWsConnected(connected as any);
      if (connected) {
        toast({
          title: '🔌 Real-time Connected',
          description: 'WebSocket connection established',
        });
      }
    }
  );

  useEffect(() => {
    fetchStudents();
    window.scrollTo(0, 0);

    // Auto-refresh interval for polling fallback
    let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
    if (autoRefreshEnabled && wsConnected) {
      autoRefreshInterval = setInterval(() => {
        fetchStudents();
      }, 30000); // Auto-refresh every 30 seconds
    }

    return () => {
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    };
  }, [autoRefreshEnabled, wsConnected]);

  // Fetch student locations for map view
  const fetchStudentLocations = async () => {
    try {
      setLoadingLocations(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:5000/api/student/all-locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student locations');
      }
      
      const data = await response.json();
      return data.students || [];
    } catch (error: any) {
      console.error('Fetch locations error:', error);
      toast({
        title: '❌ Error loading locations',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'map') {
      fetchStudentLocations();
    }
  }, [viewMode]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('http://localhost:5000/api/admin/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch students (${response.status})`);
      }
      
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error: any) {
      console.error('Fetch students error:', error);
      toast({
        title: '❌ Error loading students',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStudent = async (id: string, name: string) => {
    if (!window.confirm(`Approve ${name}? They will be able to access offers and login.`)) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem('auth_token');

      // Use the new approval endpoint
      const response = await fetch(`http://localhost:5000/api/admin/dashboard/students/${id}/approval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvalStatus: 'approved' })
      });

      if (!response.ok) throw new Error('Failed to approve student');

      // Update local state
      setStudents(students.map(s => 
        s._id === id ? { ...s, approvalStatus: 'approved' } : s
      ));

      toast({
        title: '✅ Student approved',
        description: `${name} can now login and access offers`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Error approving student',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectStudent = async (id: string, name: string) => {
    const remarks = prompt(`Enter rejection reason for ${name}:`);
    if (!remarks) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`http://localhost:5000/api/admin/dashboard/students/${id}/approval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvalStatus: 'rejected', remarks })
      });

      if (!response.ok) throw new Error('Failed to reject student');

      // Update local state
      setStudents(students.map(s => 
        s._id === id ? { ...s, approvalStatus: 'rejected' } : s
      ));

      toast({
        title: '❌ Student rejected',
        description: `${name} has been rejected`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Error rejecting student',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete student');

      setStudents(students.filter(s => s._id !== id));
      toast({
        title: '✅ Student deleted',
        description: `${name} has been removed`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Error deleting student',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    let verifyMatch = true;
    if (verifiedFilter === 'verified') verifyMatch = student.isEmailVerified;
    if (verifiedFilter === 'unverified') verifyMatch = !student.isEmailVerified;

    let approvalMatch = true;
    if (approvalFilter === 'approved') approvalMatch = student.approvalStatus === 'approved';
    if (approvalFilter === 'pending') approvalMatch = student.approvalStatus === 'pending';
    if (approvalFilter === 'rejected') approvalMatch = student.approvalStatus === 'rejected';

    return matchesSearch && verifyMatch && approvalMatch;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(`${b.firstName || ''} ${b.lastName || ''}`);
    }
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const stats = {
    total: students.length,
    verified: students.filter(s => s.isEmailVerified).length,
    unverified: students.filter(s => !s.isEmailVerified).length,
    approved: students.filter(s => s.approvalStatus === 'approved').length,
    pending: students.filter(s => s.approvalStatus === 'pending').length,
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Action Buttons */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-2xl shadow-md">
              🎓
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Manage Students
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor, verify, and manage student accounts
              </p>
              {/* Real-time Status Indicator */}
              <div className="flex items-center gap-2 mt-3">
                {wsConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-green-700 font-medium">
                      🟢 Real-time connected
                      {lastUpdate && ` • Last update: ${lastUpdate.toLocaleTimeString()}`}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <p className="text-xs text-gray-600 font-medium">⚪ Offline mode</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? "default" : "outline"}
              className="gap-2 text-sm"
            >
              📋 List View
            </Button>
            <Button
              onClick={() => setViewMode('map')}
              variant={viewMode === 'map' ? "default" : "outline"}
              className="gap-2 text-sm"
            >
              <MapPin className="w-4 h-4" />
              Map View
            </Button>
            <Button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              variant={autoRefreshEnabled ? "default" : "outline"}
              className="gap-2"
              title={autoRefreshEnabled ? "Auto-refresh enabled" : "Auto-refresh disabled"}
            >
              <RefreshCw className="w-4 h-4" />
              Auto-Refresh
            </Button>
            <Button
              onClick={fetchStudents}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Enhanced */}
      {viewMode === 'map' ? (
        // MAP VIEW
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Student Locations
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Real-time tracking of student locations
              </p>
            </div>
            <Button
              onClick={fetchStudentLocations}
              disabled={loadingLocations}
              variant="outline"
              className="gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Locations
            </Button>
          </div>
          <div style={{ height: '600px' }} className="relative">
            <StudentLocationMap
              students={students.filter(s => (s as any).latitude && (s as any).longitude).map(s => ({
                _id: s._id,
                name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username || 'Unknown',
                email: s.email,
                latitude: (s as any).latitude,
                longitude: (s as any).longitude,
                locality: (s as any).locality || '',
                city: (s as any).city || '',
                state: (s as any).state || '',
              }))}
              isLoading={loadingLocations}
              onStudentClick={(student) => {
                const fullStudent = students.find(s => s._id === student._id);
                if (fullStudent) {
                  handleViewDetails(fullStudent);
                }
              }}
            />
          </div>
        </div>
      ) : (
        <>
      {/* Stats Cards - Enhanced */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-300 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
              <GraduationCapIcon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">Total Students</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">{filteredStudents.length} visible</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-green-300 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-md">
              <CheckCircleIcon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">Verified</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.verified}</p>
          <p className="text-xs text-gray-500 mt-2">{Math.round((stats.verified / stats.total) * 100) || 0}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-orange-300 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-md">
              <XCircleIcon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">Unverified</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.unverified}</p>
          <p className="text-xs text-gray-500 mt-2">{Math.round((stats.unverified / stats.total) * 100) || 0}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-purple-300 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Award className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">Approved</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.approved}</p>
          <p className="text-xs text-gray-500 mt-2">{Math.round((stats.approved / stats.total) * 100) || 0}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-yellow-300 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center shadow-md">
              <Clock className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">Pending</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-2">{Math.round((stats.pending / stats.total) * 100) || 0}%</p>
        </div>
      </div>

      {/* Search, Filter and Sort - Enhanced */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-700" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search & Filter</h3>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by username, email, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as any)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Verification Status</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>

          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as any)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Approval Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Sort by Name</option>
          </select>

          <Button
            onClick={() => {
              setSearchTerm('');
              setVerifiedFilter('all');
              setApprovalFilter('all');
              setSortBy('newest');
            }}
            variant="outline"
            className="text-sm"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Students List - Enhanced Card View */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Student Accounts</h2>
            <p className="text-xs text-gray-600 mt-1">
              {loading ? 'Loading students...' : `Showing ${filteredStudents.length} of ${students.length} students`}
            </p>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2Icon className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">Loading student data...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-16 h-16 text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg font-medium">
                {searchTerm || verifiedFilter !== 'all' || approvalFilter !== 'all' 
                  ? 'No students found matching filters' 
                  : 'No students yet'}
              </p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student._id} className="px-6 py-5 hover:bg-blue-50 transition-colors group">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <GraduationCapIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base">
                          {student.firstName} {student.lastName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">@{student.username}</p>
                        <a 
                          href={`mailto:${student.email}`} 
                          className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </a>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {student.approvalStatus === 'approved' ? (
                        <Badge className="bg-green-100 text-green-800 border border-green-300 px-2.5 py-1 text-xs">✅ Approved</Badge>
                      ) : student.approvalStatus === 'rejected' ? (
                        <Badge className="bg-red-100 text-red-800 border border-red-300 px-2.5 py-1 text-xs">❌ Rejected</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-2.5 py-1 text-xs">⏳ Pending</Badge>
                      )}

                      {student.isEmailVerified ? (
                        <Badge className="bg-green-100 text-green-800 border border-green-300 px-2.5 py-1 text-xs">✓ Email Verified</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-2.5 py-1 text-xs">○ Email Unverified</Badge>
                      )}

                      {student.studentIdDocument ? (
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-1 text-xs">📄 ID Uploaded</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-2.5 py-1 text-xs">○ No ID</Badge>
                      )}

                      {student.studentIdUploadedAt && (
                        <Badge className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-1 text-xs">
                          📅 {new Date(student.studentIdUploadedAt).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    {student.approvalStatus !== 'approved' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApproveStudent(student._id, `${student.firstName} ${student.lastName}`)}
                          disabled={processingId === student._id}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium"
                        >
                          {processingId === student._id ? (
                            <>
                              <Loader2Icon className="w-3 h-3 animate-spin mr-1" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        {student.approvalStatus === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleRejectStudent(student._id, `${student.firstName} ${student.lastName}`)}
                            disabled={processingId === student._id}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                          >
                            {processingId === student._id ? (
                              <>
                                <Loader2Icon className="w-3 h-3 animate-spin mr-1" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleViewDetails(student)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                    >
                      📋 View Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteStudent(student._id, `${student.firstName} ${student.lastName}`)}
                      className="text-xs font-medium"
                    >
                      <TrashIcon className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      )}

      {/* Student Details Modal */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Student Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">First Name</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.firstName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Last Name</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Username</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.username}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Email</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">College Email</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{selectedStudent.collegeEmail || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">College Name</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.collegeName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Enrollment Number</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.enrollmentNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Branch</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.branch || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Year of Study</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.yearOfStudy || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Approval Status</p>
                  <Badge className={`mt-1 ${
                    selectedStudent.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedStudent.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedStudent.approvalStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Email Verified</p>
                  <Badge className={selectedStudent.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {selectedStudent.isEmailVerified ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-gray-500 font-medium uppercase mb-2">Joined</p>
                <p className="text-sm text-gray-700">{new Date(selectedStudent.createdAt).toLocaleString()}</p>
              </div>
              {selectedStudent.studentIdUploadedAt && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 font-medium uppercase mb-2">ID Document Uploaded</p>
                  <p className="text-sm text-gray-700">{new Date(selectedStudent.studentIdUploadedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="border-t px-6 py-4 bg-gray-50 flex gap-2 justify-end">
              <Button
                onClick={() => setShowDetailModal(false)}
                variant="outline"
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
