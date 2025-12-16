"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserState = {
  id: string;
  email: string;
} | null;

const initialState: UserState = null;

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser(_state, action: PayloadAction<UserState>) {
      return action.payload;
    },
    clearUser() {
      return null;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;


