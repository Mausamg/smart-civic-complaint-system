using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CivicComplaintSystem.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAnnouncementLocationScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Announcements",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "Announcements",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LocationScope",
                table: "Announcements",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "all");

            migrationBuilder.AddColumn<string>(
                name: "Municipality",
                table: "Announcements",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Province",
                table: "Announcements",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_LocationScope_Country_Province_District_Munic~",
                table: "Announcements",
                columns: new[] { "LocationScope", "Country", "Province", "District", "Municipality" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Announcements_LocationScope_Country_Province_District_Munic~",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "District",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "LocationScope",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Municipality",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Province",
                table: "Announcements");
        }
    }
}
