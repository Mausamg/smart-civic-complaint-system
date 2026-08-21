using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CivicComplaintSystem.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedToUserId",
                table: "Complaints",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Complaints_AssignedToUserId",
                table: "Complaints",
                column: "AssignedToUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Complaints_AspNetUsers_AssignedToUserId",
                table: "Complaints",
                column: "AssignedToUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Complaints_AspNetUsers_AssignedToUserId",
                table: "Complaints");

            migrationBuilder.DropIndex(
                name: "IX_Complaints_AssignedToUserId",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "AssignedToUserId",
                table: "Complaints");
        }
    }
}
