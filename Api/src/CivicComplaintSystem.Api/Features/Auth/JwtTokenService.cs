using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.IdentityModel.Tokens;

namespace CivicComplaintSystem.Api.Features.Auth;

public sealed class JwtTokenService(IConfiguration configuration)
{
    public string CreateToken(
        ApplicationUser user,
        IList<string> roles)
    {
        var jwtKey = configuration["Jwt:Key"]
                     ?? throw new InvalidOperationException(
                         "JWT key is not configured.");

        var jwtIssuer = configuration["Jwt:Issuer"]
                        ?? throw new InvalidOperationException(
                            "JWT issuer is not configured.");

        var jwtAudience = configuration["Jwt:Audience"]
                          ?? throw new InvalidOperationException(
                              "JWT audience is not configured.");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName ?? string.Empty)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}