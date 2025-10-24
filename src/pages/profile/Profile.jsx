import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { getErrorMessage } from '../../utils/errorHandler'
import { toast } from 'react-toastify'
import { User, Camera, Mail, Calendar } from 'lucide-react'
import { formatDate } from '../../utils/date'

const Profile = () => {
  const { user, updateUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('profilePicture', file)

      const response = await api.post('/users/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      updateUser(response.data.user)
      toast.success('Profile picture updated successfully!')
    } catch (error) {
      console.error('Profile picture upload error:', error)
      const errorMsg = getErrorMessage(error, 'Failed to upload profile picture')
      toast.error(errorMsg, {
        autoClose: 8000,
        style: { whiteSpace: 'pre-line' }
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveProfilePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return
    }

    try {
      const response = await api.delete('/auth/profile-picture')
      updateUser(response.data.user)
      toast.success('Profile picture removed successfully!')
    } catch (error) {
      toast.error('Failed to remove profile picture')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border dark:border-dark-border">
        <div className="flex items-center gap-3">
          <User className="text-primary-600 dark:text-dark-accent" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Profile</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information</p>
          </div>
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-6">
          Profile Picture
        </h2>

        <div className="flex items-center gap-6">
          <div className="relative">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-primary-100 dark:border-dark-accent/30"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary-100 dark:bg-dark-accent/20 flex items-center justify-center border-4 border-primary-200 dark:border-dark-accent/30">
                <span className="text-primary-600 dark:text-dark-accent font-bold text-4xl">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <button
              onClick={handleProfilePictureClick}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-primary-600 dark:bg-dark-accent text-white dark:text-dark-bg rounded-full hover:bg-primary-700 dark:hover:bg-green-600 transition-colors shadow-lg"
              title="Change profile picture"
            >
              <Camera size={20} />
            </button>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">
              Change Profile Picture
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload a new profile picture. JPG, PNG or GIF. Max size 5MB.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleProfilePictureClick}
                disabled={uploading}
                className="btn btn-primary text-sm"
              >
                {uploading ? 'Uploading...' : 'Upload New Picture'}
              </button>
              
              {user?.profilePicture && (
                <button
                  onClick={handleRemoveProfilePicture}
                  className="btn text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                >
                  Remove Picture
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-6">
          Account Information
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
            <User className="text-gray-600 dark:text-gray-400 mt-1" size={20} />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
              <p className="font-semibold text-gray-900 dark:text-dark-text mt-1">{user?.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
            <Mail className="text-gray-600 dark:text-gray-400 mt-1" size={20} />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Email Address</p>
              <p className="font-semibold text-gray-900 dark:text-dark-text mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
            <Calendar className="text-gray-600 dark:text-gray-400 mt-1" size={20} />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
              <p className="font-semibold text-gray-900 dark:text-dark-text mt-1">
                {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Stats */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-6">
          Quick Stats
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border dark:border-blue-800/30">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Account Status</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">Active</p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border dark:border-green-800/30">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Email Verified</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">Yes</p>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border dark:border-purple-800/30">
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">User ID</p>
            <p className="text-sm font-mono text-purple-900 dark:text-purple-300 mt-1 break-all">
              {user?._id || user?.id || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
