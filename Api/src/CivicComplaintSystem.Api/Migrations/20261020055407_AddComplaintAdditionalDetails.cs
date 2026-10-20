using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CivicComplaintSystem.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintAdditionalDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AffectedPeopleRange",
                table: "Complaints",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Complaints",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Complaints",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Complaints",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Municipality",
                table: "Complaints",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ObservedAt",
                table: "Complaints",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Subcategory",
                table: "Complaints",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ward",
                table: "Complaints",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AffectedPeopleRange",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "Municipality",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "ObservedAt",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "Subcategory",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "Ward",
                table: "Complaints");
        }
    }
}
