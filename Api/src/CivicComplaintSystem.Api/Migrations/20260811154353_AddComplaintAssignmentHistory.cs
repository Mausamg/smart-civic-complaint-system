using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CivicComplaintSystem.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintAssignmentHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ComplaintAssignmentHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ComplaintId = table.Column<Guid>(type: "uuid", nullable: false),
                    OldAssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    NewAssignedToUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComplaintAssignmentHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComplaintAssignmentHistories_AspNetUsers_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ComplaintAssignmentHistories_AspNetUsers_NewAssignedToUserId",
                        column: x => x.NewAssignedToUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ComplaintAssignmentHistories_AspNetUsers_OldAssignedToUserId",
                        column: x => x.OldAssignedToUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ComplaintAssignmentHistories_Complaints_ComplaintId",
                        column: x => x.ComplaintId,
                        principalTable: "Complaints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ComplaintAssignmentHistories_ChangedByUserId",
                table: "ComplaintAssignmentHistories",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ComplaintAssignmentHistories_ComplaintId",
                table: "ComplaintAssignmentHistories",
                column: "ComplaintId");

            migrationBuilder.CreateIndex(
                name: "IX_ComplaintAssignmentHistories_NewAssignedToUserId",
                table: "ComplaintAssignmentHistories",
                column: "NewAssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ComplaintAssignmentHistories_OldAssignedToUserId",
                table: "ComplaintAssignmentHistories",
                column: "OldAssignedToUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComplaintAssignmentHistories");
        }
    }
}
