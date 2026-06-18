namespace TaskManager.Application.Common;

/// <summary>Base class for expected, business-level errors mapped to HTTP responses.</summary>
public abstract class AppException(string message) : Exception(message);

/// <summary>Input failed business validation. Maps to HTTP 400.</summary>
public sealed class ValidationException(string message) : AppException(message);

/// <summary>A requested resource does not exist. Maps to HTTP 404.</summary>
public sealed class NotFoundException(string message) : AppException(message);

/// <summary>A uniqueness or state conflict (e.g. duplicate username). Maps to HTTP 409.</summary>
public sealed class ConflictException(string message) : AppException(message);

/// <summary>Authentication failed (bad credentials). Maps to HTTP 401.</summary>
public sealed class AuthenticationException(string message) : AppException(message);

/// <summary>The caller is authenticated but not allowed to act on the resource. Maps to HTTP 403.</summary>
public sealed class ForbiddenException(string message) : AppException(message);
