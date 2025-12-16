import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import userReducer, { type UserState } from "./userSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

export type RootState = {
  user: UserState;
};

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;


