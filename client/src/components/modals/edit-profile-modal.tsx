import React from "react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const editProfileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
});

type EditProfileData = z.infer<typeof editProfileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<EditProfileData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: (user as any)?.phone || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileData) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      // Profile updated - user data will be refreshed on next auth check
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update profile", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: EditProfileData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="edit-profile-modal">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      data-testid="input-fullname"
                      placeholder="Enter your full name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      data-testid="input-email"
                      placeholder="Enter your email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      data-testid="input-phone"
                      placeholder="Enter your phone number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="flex-1"
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-profile"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}