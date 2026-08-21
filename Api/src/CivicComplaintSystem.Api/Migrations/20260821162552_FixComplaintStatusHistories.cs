using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CivicComplaintSystem.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixComplaintStatusHistories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.CreateTable(
        name: "ComplaintStatusHistories",
        columns: table => new
        {
            Id = table.Column<Guid>(
                type: "uuid",
                nullable: false),

            ComplaintId = table.Column<Guid>(
                type: "uuid",
                nullable: false),

            OldStatus = table.Column<int>(
                type: "integer",
                nullable: false),

            NewStatus = table.Column<int>(
                type: "integer",
                nullable: false),

            ChangedByUserId = table.Column<Guid>(
                type: "uuid",
                nullable: false),

            ChangedAtUtc = table.Column<DateTime>(
                type: "timestamp with time zone",
                nullable: false),

            Note = table.Column<string>(
                type: "text",
                nullable: true)
        },
        constraints: table =>
        {
            table.PrimaryKey(
                "PK_ComplaintStatusHistories",
                x => x.Id);

            table.ForeignKey(
                name: "FK_ComplaintStatusHistories_AspNetUsers_ChangedByUserId",
                column: x => x.ChangedByUserId,
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            table.ForeignKey(
                name: "FK_ComplaintStatusHistories_Complaints_ComplaintId",
                column: x => x.ComplaintId,
                principalTable: "Complaints",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        });

    migrationBuilder.CreateIndex(
        name: "IX_ComplaintStatusHistories_ChangedByUserId",
        table: "ComplaintStatusHistories",
        column: "ChangedByUserId");

    migrationBuilder.CreateIndex(
        name: "IX_ComplaintStatusHistories_ComplaintId",
        table: "ComplaintStatusHistories",
        column: "ComplaintId");
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComplaintStatusHistories");
        }
    }
}
