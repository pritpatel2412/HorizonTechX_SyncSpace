import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useListFiles, useGetMe } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Upload, File, Download, Search, FileText, Image as ImageIcon, Video, Music, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export function Files() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: files, isLoading, refetch } = useListFiles();
  const { data: me } = useGetMe();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    
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
    if (mimeType.startsWith('image/')) return <ImageIcon size={16} className="text-[#57c1ff]" />;
    if (mimeType.startsWith('video/')) return <Video size={16} className="text-[#ff6161]" />;
    if (mimeType.startsWith('audio/')) return <Music size={16} className="text-[#ffc533]" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return <Archive size={16} className="text-[#ffc533]" />;
    return <FileText size={16} className="text-[#9c9c9d]" />;
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
    <div className="flex h-screen bg-[#07080a] text-[#cdcdcd] overflow-hidden selection:bg-white/10 selection:text-white">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8 bg-[#07080a]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1000px] mx-auto h-full flex flex-col">
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#f4f4f6] mb-1" style={{ fontFeatureSettings: '"calt", "kern", "liga", "ss03"' }}>Files</h1>
              <p className="text-[#9c9c9d] text-sm">Manage and share files across your team.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6a6b6c]" size={15} />
                <Input 
                  placeholder="Search files..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-60 bg-[#101111] border-[#242728] text-white placeholder-[#6a6b6c] focus:border-[#cdcdcd] focus:ring-0 text-[13px] h-9 rounded-[8px]"
                  data-testid="input-search-files"
                />
              </div>
              <Button asChild className="bg-white hover:bg-[#e8e8e8] text-black font-semibold text-[13px] h-9 px-4 rounded-[8px] border-0 transition-colors shadow-none cursor-pointer" data-testid="button-upload-file">
                <label className="cursor-pointer flex items-center gap-1.5">
                  <Upload size={15} />
                  Upload File
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </Button>
            </div>
          </header>

          {/* Table list block */}
          <div className="bg-[#0d0d0d] border border-[#242728] rounded-[10px] flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-[#242728] font-medium text-xs text-[#9c9c9d] bg-[#101111]">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Uploaded By</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            <div className="flex-1 overflow-auto divide-y divide-[#242728]">
              {isLoading ? (
                <div className="p-8 text-center text-[#6a6b6c] flex flex-col items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-4"></div>
                  Loading files...
                </div>
              ) : filteredFiles.length > 0 ? (
                <div className="divide-y divide-[#242728]">
                  {filteredFiles.map((file) => (
                    <div key={file.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#121212] transition-colors group">
                      <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                        {getFileIcon(file.mimeType)}
                        <span className="truncate text-[14px] font-medium text-[#f4f4f6]" title={file.originalName}>{file.originalName}</span>
                      </div>
                      <div className="col-span-2 text-xs text-[#9c9c9d]">
                        {formatSize(file.size)}
                      </div>
                      <div className="col-span-2 text-xs text-[#9c9c9d] truncate">
                        {file.uploaderName === me?.name ? 'You' : file.uploaderName}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild 
                          className="bg-[#101111] hover:bg-white/[0.05] border border-[#242728] text-white rounded-[8px] h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all" 
                          data-testid={`button-download-${file.id}`}
                        >
                          <a href={`${import.meta.env.VITE_API_URL || ''}/api/files/${file.fileId}`} target="_blank" rel="noreferrer" download>
                            <Download size={14} />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center flex flex-col items-center justify-center text-[#6a6b6c] h-64">
                  <File size={40} className="mb-4 opacity-15" />
                  <p className="text-sm font-medium text-white mb-1">No files found</p>
                  <p className="text-xs">Upload a file to get started.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
