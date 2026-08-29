import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { env } from '../../config/env.js';
import { REFRESH_COOKIE, REFRESH_COOKIE_MAX_AGE_MS } from '../../config/constants.js';
import * as authService from './auth.service.js';
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateMeInput } from './auth.validation.js';

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/v1/auth',
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
};

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.validatedBody as RegisterInput);
  sendSuccess(res, { status: 201, data: user });
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.validatedBody as LoginInput);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { data: { user, accessToken } });
});

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.refresh(
    req.cookies?.[REFRESH_COOKIE] as string | undefined
  );
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { data: { user, accessToken } });
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.user?.id, req.cookies?.[REFRESH_COOKIE] as string | undefined);
  clearRefreshCookie(res);
  res.status(204).end();
});

export const getMeController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  sendSuccess(res, { data: user });
});

export const updateMeController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateMe(req.user!.id, req.validatedBody as UpdateMeInput);
  sendSuccess(res, { data: user });
});

export const changePasswordController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.changePassword(req.user!.id, req.validatedBody as ChangePasswordInput);
  sendSuccess(res, { data: user });
});

export const deleteMeController = asyncHandler(async (req: Request, res: Response) => {
  await authService.deleteMe(req.user!.id);
  clearRefreshCookie(res);
  res.status(204).end();
});