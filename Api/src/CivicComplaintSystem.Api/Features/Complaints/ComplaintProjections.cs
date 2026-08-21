using System.Linq.Expressions;

namespace CivicComplaintSystem.Api.Features.Complaints;

public static class ComplaintProjections
{
    public static readonly
        Expression<Func<Complaint, ComplaintResponse>>
        ToResponse =
            c => new ComplaintResponse
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                Category = c.Category,
                Location = c.Location,

                Status =
                    c.Status.ToString(),
                
                Priority =
                    c.Priority.ToString(),

                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,

                SubmittedByUserId =
                    c.SubmittedByUserId,

                AssignedToUserId =
                    c.AssignedToUserId,

                SubmittedBy =
                    new UserSummaryResponse
                    {
                        Id =
                            c.SubmittedByUser.Id,

                        FirstName =
                            c.SubmittedByUser.FirstName,

                        LastName =
                            c.SubmittedByUser.LastName,

                        Email =
                            c.SubmittedByUser.Email
                    },

                AssignedTo =
                    c.AssignedToUser == null
                        ? null
                        : new UserSummaryResponse
                        {
                            Id =
                                c.AssignedToUser.Id,

                            FirstName =
                                c.AssignedToUser.FirstName,

                            LastName =
                                c.AssignedToUser.LastName,

                            Email =
                                c.AssignedToUser.Email
                        }
            };
}