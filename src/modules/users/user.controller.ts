import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as userService from './user.service.js';
import type { ListUsersQuery } from './user.validation.js';

export const listUsersController = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.listUsers(req.query as unknown as ListUsersQuery);
  sendSuccess(res, { data: result.users, meta: { pagination: result.pagination } });
});

export const updateUserController = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(String(req.params.id), req.body);
  sendSuccess(res, { data: user });
});