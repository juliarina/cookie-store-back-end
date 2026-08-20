import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as userService from './user.service.js';
import type { ListUsersQuery, RegisterAdminInput, UpdateUserInput } from './user.validation.js';

export const listUsersController = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.listUsers(req.validatedQuery as ListUsersQuery);
  sendSuccess(res, { data: result.users, meta: { pagination: result.pagination } });
});

export const registerAdminController = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.registerAdmin(req.validatedBody as RegisterAdminInput);
  sendSuccess(res, { status: 201, data: user });
});

export const updateUserController = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(
    (req.validatedParams as { id: string }).id,
    req.validatedBody as UpdateUserInput
  );
  sendSuccess(res, { data: user });
});