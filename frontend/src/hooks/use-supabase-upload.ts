// Stub - Supabase upload removed. Use your own storage solution.
export function useSupabaseUpload() {
  return {
    uploading: false,
    uploadFile: async (_file: File): Promise<string | null> => {
      console.warn('Supabase upload not configured');
      return null;
    },
  };
}
