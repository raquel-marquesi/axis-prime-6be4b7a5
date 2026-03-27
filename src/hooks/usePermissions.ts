export const usePermissions = (userId?: string, roles?: any[]) => {
  return {
    hasPermission: (_module: string, _action: string) => true,
    permissions: [],
    isLoading: false,
    can: (_module: string, _action: string) => true,
    canAny: (_module: string, _actions: string[]) => true,
    getScope: (_module: string, _action: string) => null as any,
  };
};
