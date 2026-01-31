
import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Image, Upload, X } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  name: string;
}

const PhotoGallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos: Photo[] = [];
      
      Array.from(e.target.files).forEach(file => {
        // Create a URL for the file
        const url = URL.createObjectURL(file);
        const id = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        newPhotos.push({
          id,
          url,
          name: file.name,
        });
      });
      
      setPhotos(prev => [...prev, ...newPhotos]);
      toast({
        title: "Photos uploaded",
        description: `Successfully added ${newPhotos.length} new photo${newPhotos.length > 1 ? 's' : ''}`,
      });
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const removePhoto = (photoId: string) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
    toast({
      title: "Photo removed",
      description: "The photo has been removed from the gallery",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 justify-center">
        <Button 
          onClick={triggerFileInput} 
          className="bg-brand-blue hover:bg-brand-blue/80 text-white"
          size="lg"
        >
          <Upload className="mr-2 h-5 w-5" /> Upload Photos
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          multiple
        />
      </div>
      
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-muted rounded-xl p-10 text-center">
          <Image className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">No photos yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Upload photos of your training sessions to showcase your group's activities
          </p>
          <Button onClick={triggerFileInput} variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Select Files
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0 relative">
                <AspectRatio ratio={4/3}>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="object-cover w-full h-full cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setSelectedPhoto(photo)}
                  />
                </AspectRatio>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => removePhoto(photo.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Preview Dialog */}
      <AlertDialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <AlertDialogContent className="max-w-3xl overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedPhoto?.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {selectedPhoto && (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="w-full object-contain"
              />
            )}
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PhotoGallery;
