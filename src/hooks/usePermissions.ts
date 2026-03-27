export const usePermissions = () => {
  return {
    hasPermission: (_module: string, _action: string) => true,
    permissions: [],
    isLoading: false,
  };
};
