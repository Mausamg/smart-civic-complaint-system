using System.Text;
using System.Text.Json.Serialization;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints.Attachments;
using CivicComplaintSystem.Api.Features.Complaints.Services;
using CivicComplaintSystem.Api.Features.Dashboard;
using CivicComplaintSystem.Api.Features.Notifications;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Api.Features.Users.Staff;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddProblemDetails();
builder.Services.AddScoped<ComplaintQueryService>();
builder.Services.AddScoped<ComplaintCommandService>();
builder.Services.AddScoped<ComplaintAccessService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ComplaintAttachmentService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<StaffService>();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services
    .AddIdentityCore<ApplicationUser>()
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>();

var jwtKey = builder.Configuration["Jwt:Key"]
             ?? throw new InvalidOperationException(
                 "JWT key is not configured.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException(
                    "JWT issuer is not configured.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
                  ?? throw new InvalidOperationException(
                      "JWT audience is not configured.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,

                ValidateAudience = true,
                ValidAudience = jwtAudience,

                ValidateIssuerSigningKey = true,
                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey)),

                ValidateLifetime = true
            };

        options.Events =
            new JwtBearerEvents
            {
                OnTokenValidated =
                    async context =>
                    {
                        var userId =
                            context.Principal?
                                .FindFirstValue(
                                    ClaimTypes.NameIdentifier);

                        if (string.IsNullOrWhiteSpace(userId))
                        {
                            context.Fail(
                                "Invalid user identity.");

                            return;
                        }

                        var userManager =
                            context.HttpContext
                                .RequestServices
                                .GetRequiredService<
                                    UserManager<ApplicationUser>>();

                        var user =
                            await userManager.FindByIdAsync(
                                userId);

                        if (user is null ||
                            !user.IsActive)
                        {
                            context.Fail(
                                "User account is invalid or inactive.");
                        }
                    }
            };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<JwtTokenService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await IdentitySeeder.SeedIdentity(
        scope.ServiceProvider);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.UseExceptionHandler();


app.Run();

