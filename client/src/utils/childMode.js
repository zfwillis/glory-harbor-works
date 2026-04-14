export const CHILD_MODE_STORAGE_KEY = "activeChildModeId";

export const getActiveChildModeId = () => localStorage.getItem(CHILD_MODE_STORAGE_KEY) || "";

export const enterChildMode = (childId) => {
  localStorage.setItem(CHILD_MODE_STORAGE_KEY, childId);
};

export const exitChildMode = () => {
  localStorage.removeItem(CHILD_MODE_STORAGE_KEY);
};
