import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProfilePhotoUploadProps {
  currentPhoto?: string | null;
  userName: string;
  size?: "sm" | "md" | "lg";
  showUploadButton?: boolean;
}

export default function ProfilePhotoUpload({ 
  currentPhoto, 
  userName, 
  size = "md",
  showUploadButton = true 
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      return await apiRequest('POST', '/api/profile/photo', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          // Don't set Content-Type, let browser set it with boundary for FormData
        }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profile photo updated successfully!",
        description: "Your new profile photo has been uploaded."
      });
      setIsUploading(false);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile photo. Please try again.",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/profile/photo', {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profile photo removed",
        description: "Your profile photo has been removed."
      });
    },
    onError: (error: any) => {
      console.error('Remove error:', error);
      toast({
        title: "Failed to remove photo",
        description: error.message || "Failed to remove profile photo. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a .jpg, .jpeg, or .png file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    removeMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className={sizeClasses[size]} data-testid="avatar-profile-photo">
          <AvatarImage 
            src={currentPhoto || undefined} 
            alt={userName}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {size === "lg" && (
          <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 border-2 border-border">
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 rounded-full p-0"
              onClick={handleUploadClick}
              disabled={isUploading}
              data-testid="button-change-photo"
            >
              <i className="fas fa-camera text-xs"></i>
            </Button>
          </div>
        )}
      </div>

      {showUploadButton && size !== "lg" && (
        <div className="flex flex-col items-center space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUploadClick}
              disabled={isUploading}
              data-testid="button-upload-photo"
            >
              {isUploading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="fas fa-upload mr-2"></i>
                  {currentPhoto ? 'Change Photo' : 'Upload Photo'}
                </>
              )}
            </Button>
            
            {currentPhoto && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemovePhoto}
                disabled={removeMutation.isPending}
                data-testid="button-remove-photo"
              >
                <i className="fas fa-trash mr-2"></i>
                Remove
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            JPG, JPEG, PNG • Max 5MB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file-upload"
      />
    </div>
  );
}