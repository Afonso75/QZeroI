export function useBusinessRole(user) {
  if (!user) {
    return {
      isOwner: false,
      isStaff: false,
      hasBusinessAccess: false
    };
  }

  const isOwner = user.is_business_user === true && user.is_staff_member === false;
  const isStaff = user.is_staff_member === true;
  const hasBusinessAccess = user.is_business_user === true;

  return {
    isOwner,
    isStaff,
    hasBusinessAccess,
    permissions: isStaff ? user.staff_permissions : null
  };
}
