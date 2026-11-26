import { userLoginSchema, userRegistrationSchema } from "@theatre/shared";
import type { AsyncRequestHandler } from "../utils/asyncHandler.js";
import {
  DUMMY_HASH,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../auth/hash.js";
import {
  createUser,
  getUserById,
  getUserByUsername,
  setLastLogin,
  updateUser,
} from "../db/queries/users.js";
import { logEvent } from "../logger.js";
import { requestId, requireUser } from "./helpers.js";
import { issueTokens } from "../auth/issueTokens.js";
import {
  getUserIdByRefreshToken,
  revokeRefreshToken,
} from "../db/queries/refreshTokens.js";
import {
  clearAuthCookies,
  getCookie,
  REFRESH_COOKIE_NAME,
} from "../auth/cookies.js";
import { HttpError } from "../utils/errors.js";
import { verifyRefreshToken } from "../auth/jwt.js";
import { userUpdateSchema } from "../../../shared/src/models/users.js";

export const usersRegister: AsyncRequestHandler = async (req, res) => {
  const input = userRegistrationSchema.parse(req.body);
  const hash = await hashPassword(input.password);
  const newUser = await createUser(input.username, input.email, hash);

  logEvent("user_registration", {
    requestId: requestId(res),
    username: newUser.username,
    role: newUser.role,
    bootstrap: newUser.firstAdmin,
  });

  await issueTokens(res, newUser);
  await setLastLogin(newUser.id);

  const { passwordHash: _hash, firstAdmin: _firstAdmin, ...user } = newUser;

  res.status(201).json({ user });
};

export const usersLogin: AsyncRequestHandler = async (req, res) => {
  const input = userLoginSchema.parse(req.body);
  const fullUser = await getUserByUsername(input.username);

  if (!fullUser) {
    await verifyPassword(input.password, DUMMY_HASH); // prevent measuring response time
    logEvent("user_login_fail", {
      requestId: requestId(res),
      username: input.username,
      reason: "unknown_username",
    });
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const isValid = await verifyPassword(input.password, fullUser.passwordHash);

  if (!isValid) {
    logEvent("user_login_fail", {
      requestId: requestId(res),
      username: input.username,
      reason: "wrong_password",
    });
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  await issueTokens(res, fullUser);
  await setLastLogin(fullUser.id);

  logEvent("user_login", {
    requestId: requestId(res),
    username: fullUser.username,
  });

  const { passwordHash: _hash, ...user } = fullUser;

  res.status(200).json({ user });
};

export const usersLogout: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  await revokeRefreshToken(user.id);
  clearAuthCookies(res);

  logEvent("user_logout", {
    requestId: requestId(res),
    username: user.username,
  });

  res.status(200).json({ message: "Logged out" });
};

export const usersSelf: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  res.status(200).json({ user });
};

export const usersRefresh: AsyncRequestHandler = async (req, res) => {
  if (!req.headers.cookie) throw new HttpError(401, "Refresh token required");
  const token = getCookie(REFRESH_COOKIE_NAME, req.headers.cookie);
  if (!token) {
    throw new HttpError(401, "Refresh token required");
  }

  const payload = verifyRefreshToken(token, requestId(res));
  const rowUserId = await getUserIdByRefreshToken(hashToken(token));
  if (!rowUserId || rowUserId !== payload.userId) {
    logEvent("token_refresh_rejected", {
      requestId: requestId(res),
      userId: payload.userId,
      reason: !rowUserId ? "unknown_token" : "user_mismatch",
    });
    throw new HttpError(401, "Invalid refresh token");
  }

  const user = await getUserById(rowUserId);
  if (!user) {
    logEvent("token_refresh_rejected", {
      requestId: requestId(res),
      userId: payload.userId,
      reason: "user_not_found",
    });
    throw new HttpError(401, "Invalid refresh token");
  }

  await issueTokens(res, user);

  logEvent("token_refresh", {
    requestId: requestId(res),
    user: user.username,
  });

  res.status(200).json({ message: "Token refreshed" });
};

export const usersSelfUpdate: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const { username, email, password } = userUpdateSchema.parse(req.body);
  let passwordHash: string | undefined = undefined;
  if (password) {
    passwordHash = await hashPassword(password);
  }
  const updatedUser = await updateUser(user.id, {
    username,
    email,
    passwordHash,
  });
  const { passwordHash: _hash, ...responseUser } = updatedUser;
  res.status(200).json(responseUser);
};
