import { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropModal({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onCropComplete 
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropAreaComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = useCallback(async (
    imageSrc: string,
    pixelCrop: Area,
    brightness: number,
    contrast: number
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas size to match crop area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Apply brightness and contrast filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.9);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;
    
    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        brightness,
        contrast
      );
      onCropComplete(croppedImageBlob);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, brightness, contrast, getCroppedImg, onCropComplete, onClose]);

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    onClose();
  };

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="image-crop-modal">
        <DialogHeader>
          <DialogTitle>Crop & Adjust Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Crop Area */}
          <div className="relative h-96 bg-black rounded-lg overflow-hidden">
            <div 
              className="w-full h-full"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%)`
              }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropAreaComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zoom Control */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Zoom</Label>
              <div className="flex items-center space-x-3">
                <i className="fas fa-search-minus text-muted-foreground"></i>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                  data-testid="slider-zoom"
                />
                <i className="fas fa-search-plus text-muted-foreground"></i>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {Math.round(zoom * 100)}%
              </div>
            </div>

            {/* Brightness Control */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Brightness</Label>
              <div className="flex items-center space-x-3">
                <i className="fas fa-sun text-muted-foreground"></i>
                <Slider
                  value={[brightness]}
                  onValueChange={(value) => setBrightness(value[0])}
                  min={50}
                  max={150}
                  step={5}
                  className="flex-1"
                  data-testid="slider-brightness"
                />
                <i className="fas fa-sun text-muted-foreground"></i>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {brightness}%
              </div>
            </div>

            {/* Contrast Control */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Contrast</Label>
              <div className="flex items-center space-x-3">
                <i className="fas fa-adjust text-muted-foreground"></i>
                <Slider
                  value={[contrast]}
                  onValueChange={(value) => setContrast(value[0])}
                  min={50}
                  max={150}
                  step={5}
                  className="flex-1"
                  data-testid="slider-contrast"
                />
                <i className="fas fa-adjust text-muted-foreground"></i>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {contrast}%
              </div>
            </div>

            {/* Reset Button */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Reset</Label>
              <Button
                variant="outline"
                onClick={resetAdjustments}
                className="w-full"
                data-testid="button-reset-adjustments"
              >
                <i className="fas fa-undo mr-2"></i>
                Reset Adjustments
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              data-testid="button-cancel-crop"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing || !croppedAreaPixels}
              className="flex-1"
              data-testid="button-save-crop"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Save Photo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}