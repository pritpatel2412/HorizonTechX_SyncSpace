import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useListFiles, useUploadFile, useGetMe } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Upload, File, Download, Search, FileText, Image as ImageIcon, Video, Music, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export function Files() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: files, isLoading, refetch } = useListFiles();
  const uploadFile = useUploadFile();
  const { data: me } = useGetMe();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We can't directly upload File object via Orval hook easily if it uses FormData in custom way,
    // The hook expects { data: FileUploadInput }.
    // Wait, the API spec says `useUploadFile` takes `fileUploadInput` but actually it needs FormData.
    // The generated hook `uploadFile` has a custom implementation in the prompt:
    // `POST to /api/files/upload with multipart/form-data (roomId in form)`.
    // Actually the generated hook in the prompt says:
    // export const uploadFile = async (fileUploadInput: FileUploadInput, options?: RequestInit) => { const formData = new FormData(); if(fileUploadInput.roomId) formData.append('roomId', fileUploadInput.roomId); ... }
    // Wait, how to append the file? The hook definition generated doesn't append the file!
    // Let's check `lib/api-client-react/src/generated/api.ts` from previous read.
    // The generated hook:
    // `export const uploadFile = async (fileUploadInput: FileUploadInput, options?: RequestInit) ... const formData = new FormData(); if(fileUploadInput.roomId !== undefined) formData.append('roomId', fileUploadInput.roomId);`
    // It doesn't append the file. This is a common issue with Orval and files.
    // I will use raw fetch for upload if the hook doesn't support file payload.
    
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('syncspace_token');
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    const uploadPromise = fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    }).then(() => {
      refetch();
    });

    toast.promise(uploadPromise, {
      loading: 'Uploading file...',
      success: 'File uploaded successfully',
      error: 'Failed to upload file'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} className="text-blue-400" />;
    if (mimeType.startsWith('video/')) return <Video size={20} className="text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music size={20} className="text-yellow-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return <Archive size={20} className="text-orange-400" />;
    return <FileText size={20} className="text-gray-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files?.filter(f => f.originalName.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto h-full flex flex-col">
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Files</h1>
              <p className="text-muted-foreground">Manage and share files across your team.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="Search files..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-surface border-border"
                  data-testid="input-search-files"
                />
              </div>
              <Button asChild data-testid="button-upload-file">
                <label className="cursor-pointer flex items-center gap-2">
                  <Upload size={18} />
                  Upload File
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </Button>
            </div>
          </header>

          <div className="bg-surface border border-border rounded-xl flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border font-medium text-sm text-muted-foreground bg-surface-2">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Uploaded By</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  Loading files...
                </div>
              ) : filteredFiles.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredFiles.map((file) => (
                    <div key={file.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-surface-2/50 transition-colors group">
                      <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                        {getFileIcon(file.mimeType)}
                        <span className="truncate font-medium" title={file.originalName}>{file.originalName}</span>
                      </div>
                      <div className="col-span-2 text-sm text-muted-foreground">
                        {formatSize(file.size)}
                      </div>
                      <div className="col-span-2 text-sm text-muted-foreground truncate">
                        {file.uploaderName === me?.name ? 'You' : file.uploaderName}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-download-${file.id}`}>
                          <a href={`${import.meta.env.VITE_API_URL || ''}/api/files/${file.fileId}`} target="_blank" rel="noreferrer" download>
                            <Download size={16} />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center flex flex-col items-center justify-center text-muted-foreground h-full">
                  <File size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-1">No files found</p>
                  <p className="text-sm">Upload a file to get started.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
