using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CivicComplaintSystem.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAssignedComplaintStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                                 UPDATE "Complaints"
                                 SET "Status" = 1
                                 WHERE "Status" = 2;
                                 """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            
        }
    }
}
