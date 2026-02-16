import { useState, useEffect } from 'react';
import { StudentSidebar } from './dashboard/sidebar';
import { DashboardHeader } from './dashboard-header';
import { StudentLocationMap } from './student-location-map';
import { CheckCircle, Clock, XCircle, Edit2, Save, Camera, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuthStore } from '../../stores/authStore';

interface StudentProfile {
  name: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  yearOfStudy: string;
  studentId: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  profileImage?: string;
}

export function ProfilePage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<StudentProfile>({
    name: user?.name || 'Student',
    email: user?.email || 'student@example.com',
    phone: '+91 0000000000',
    college: 'Tech Institute of India',
    course: 'B.Tech Computer Science',
    yearOfStudy: '3rd Year',
    studentId: 'STU-2024-001234',
    verificationStatus: 'verified',
    profileImage: undefined,
  });

  const [formData, setFormData] = useState(profile);

  // Fetch student profile from API
  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch('http://localhost:5000/api/student/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setStudentData(data.student || data);
          
          // Update profile with real data
          const studentInfo: StudentProfile = {
            name: data.student?.name || user?.name || 'Student',
            email: data.student?.email || user?.email || 'student@example.com',
            phone: data.student?.phone || '+91 0000000000',
            college: data.student?.college || 'Tech Institute of India',
            course: data.student?.course || 'B.Tech Computer Science',
            yearOfStudy: data.student?.yearOfStudy || '3rd Year',
            studentId: data.student?.studentId || 'STU-2024-001234',
            verificationStatus: data.student?.verificationStatus || 'verified',
            profileImage: data.student?.profileImage,
          };
          
          setProfile(studentInfo);
          setFormData(studentInfo);
        } else {
          // Use user data from auth store as fallback
          const studentInfo: StudentProfile = {
            name: user?.name || 'Student',
            email: user?.email || 'student@example.com',
            phone: '+91 0000000000',
            college: 'Tech Institute of India',
            course: 'B.Tech Computer Science',
            yearOfStudy: '3rd Year',
            studentId: 'STU-2024-001234',
            verificationStatus: 'verified',
          };
          setProfile(studentInfo);
          setFormData(studentInfo);
        }
      } catch (err) {
        console.error('Error fetching student profile:', err);
        // Use user data from auth store as fallback
        const studentInfo: StudentProfile = {
          name: user?.name || 'Student',
          email: user?.email || 'student@example.com',
          phone: '+91 0000000000',
          college: 'Tech Institute of India',
          course: 'B.Tech Computer Science',
          yearOfStudy: '3rd Year',
          studentId: 'STU-2024-001234',
          verificationStatus: 'verified',
        };
        setProfile(studentInfo);
        setFormData(studentInfo);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setProfile(formData);
    setIsEditing(false);
    console.log('Profile updated:', formData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingId(true);
      setTimeout(() => {
        alert('Student ID uploaded successfully! Verification in progress...');
        setUploadingId(false);
      }, 1500);
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          profileImage: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getVerificationStatusColor = () => {
    switch (formData.verificationStatus) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationIcon = () => {
    switch (formData.verificationStatus) {
      case 'verified':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <DashboardHeader 
          studentName={profile.name}
          studentEmail={profile.email}
          verificationStatus={profile.verificationStatus}
        />
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile & Verification</h1>
            <p className="text-gray-600">Manage your profile information and verification status</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your profile...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200 overflow-hidden">
                  {formData.profileImage ? (
                    <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageUpload}
                    />
                  </label>
                )}
              </div>
              <p className="text-center font-semibold text-gray-900">{formData.name}</p>
            </div>

              {/* Verification Status */}
              <div className={`rounded-xl p-6 border-2 ${getVerificationStatusColor()} bg-white`}>
              <div className="flex items-center gap-3 mb-2">
                {getVerificationIcon()}
                <h3 className="font-bold text-lg">
                  {formData.verificationStatus === 'verified'
                    ? 'Verified Account'
                    : formData.verificationStatus === 'pending'
                    ? 'Verification Pending'
                    : 'Verification Rejected'}
                </h3>
              </div>
              <p className="text-sm">
                {formData.verificationStatus === 'verified'
                  ? 'Your student ID has been verified. You can access all exclusive student benefits!'
                  : formData.verificationStatus === 'pending'
                  ? 'Your verification is under review. This usually takes 24-48 hours.'
                  : 'Your verification was rejected. Please upload a clear, valid student ID.'}
              </p>
            </div>

            {/* Personal Details */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-gray-900">Personal Details</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors px-4 py-2 hover:bg-purple-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* College */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">College/University</label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course/Degree</label>
                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Year of Study */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Year of Study</label>
                  <select
                    name="yearOfStudy"
                    value={formData.yearOfStudy}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {/* Student ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                  <input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 mt-8 pt-6 border-t">
                  <Button
                    onClick={() => {
                      setFormData(profile);
                      setIsEditing(false);
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            {/* Student ID Upload */}
            <div className="bg-blue-50 rounded-xl shadow-md p-8 border-2 border-dashed border-blue-300">
              <div className="flex items-center gap-3 mb-3">
                <Upload className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-gray-900">Upload Student ID</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Upload a clear photo of your valid student ID card to verify your student status and unlock exclusive benefits.
              </p>
              <label className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                {uploadingId ? 'Uploading...' : 'Upload Student ID'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploadingId}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Real-Time Location Map */}
            <StudentLocationMap studentData={studentData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
